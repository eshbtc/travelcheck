const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const moment = require("moment");
const _ = require("lodash");

/**
 * Travel History Analysis - Cross-reference passport stamps with flight data
 */
exports.analyzeTravelHistory = onRequest({
  timeoutSeconds: 300,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const {userId} = req.body;

    if (!userId) {
      return res.status(400).json({error: "Missing user ID"});
    }

    // Get passport scans
    const passportSnaps = await admin.firestore()
        .collection("passport_scans")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

    // Get flight emails
    const flightSnaps = await admin.firestore()
        .collection("flight_emails")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

    const passportData = passportSnaps.docs.map((doc) => doc.data());
    const flightData = flightSnaps.docs.map((doc) => doc.data());

    // Analyze and cross-reference data
    const travelHistory = await crossReferenceTravelData(passportData, flightData);

    // Save analyzed travel history
    await admin.firestore()
        .collection("travel_history")
        .doc(userId)
        .set({
          ...travelHistory,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          userId,
        });

    res.json({
      success: true,
      travelHistory,
    });
  } catch (error) {
    console.error("Error analyzing travel history:", error);
    res.status(500).json({error: "Failed to analyze travel history"});
  }
});

/**
 * Generate USCIS Report - Create formatted travel history report
 */
exports.generateUSCISReport = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
  cors: true,
}, async (req, res) => {
  try {
    const {userId, format = "pdf"} = req.body;

    if (!userId) {
      return res.status(400).json({error: "Missing user ID"});
    }

    // Get travel history
    const travelHistoryDoc = await admin.firestore()
        .collection("travel_history")
        .doc(userId)
        .get();

    if (!travelHistoryDoc.exists) {
      return res.status(404).json({error: "Travel history not found"});
    }

    const travelHistory = travelHistoryDoc.data();

    // Generate report based on format
    let reportData;
    if (format === "pdf") {
      reportData = await generatePDFReport(travelHistory);
    } else {
      reportData = await generateJSONReport(travelHistory);
    }

    // Save report to Firestore
    await admin.firestore()
        .collection("reports")
        .add({
          userId,
          format,
          data: reportData,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    res.json({
      success: true,
      report: reportData,
    });
  } catch (error) {
    console.error("Error generating USCIS report:", error);
    res.status(500).json({error: "Failed to generate report"});
  }
});

/**
 * Scheduled Function - Daily email sync
 */
exports.dailyEmailSync = onSchedule({
  schedule: "0 9 * * *", // 9 AM daily
  timeZone: "America/New_York",
}, async (event) => {
  console.log("Running daily email sync...");

  // Get all users with Gmail integration
  const usersSnap = await admin.firestore()
      .collection("users")
      .where("gmailEnabled", "==", true)
      .get();

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    try {
      // Trigger email parsing for each user
      await parseGmailEmails({
        accessToken: user.gmailAccessToken,
        userId: user.uid,
      });
    } catch (error) {
      console.error(`Error syncing emails for user ${user.uid}:`, error);
    }
  }
});

// Helper Functions

async function crossReferenceTravelData(passportData, flightData) {
  // Implement cross-referencing logic
  const travelEntries = [];

  // Process passport stamps
  for (const passport of passportData) {
    const stamps = extractPassportStamps(passport.extractedText);
    travelEntries.push(...stamps);
  }

  // Process flight data
  for (const flight of flightData) {
    const flights = extractFlightDetails(flight.extractedFlights);
    travelEntries.push(...flights);
  }

  // Sort by date and remove duplicates
  const sortedEntries = _.sortBy(travelEntries, "date");
  const uniqueEntries = _.uniqBy(sortedEntries, (entry) =>
    `${entry.date}_${entry.country}_${entry.type}`,
  );

  return {
    entries: uniqueEntries,
    totalTrips: uniqueEntries.length,
    countries: _.uniq(uniqueEntries.map((e) => e.country)),
    dateRange: {
      start: _.minBy(uniqueEntries, "date") ? _.minBy(uniqueEntries, "date").date : null,
      end: _.maxBy(uniqueEntries, "date") ? _.maxBy(uniqueEntries, "date").date : null,
    },
  };
}

function extractPassportStamps(text) {
  // Implement passport stamp extraction logic
  const stamps = [];

  // Common passport stamp patterns
  const stampPatterns = [
    /(\w{3})\s+(\d{1,2})\s+(\d{4})/g, // Month Day Year
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // MM/DD/YYYY
    /(\d{4})-(\d{2})-(\d{2})/g, // YYYY-MM-DD
  ];

  // Country patterns
  const countryPatterns = [
    /(?:ENTRY|EXIT|ARRIVAL|DEPARTURE)\s+([A-Z\s]+)/gi,
    /([A-Z]{2,3})\s+(?:AIRPORT|PORT|BORDER)/gi,
  ];

  // Extract dates
  stampPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const date = moment(match[0], ["MMM DD YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD");
      if (date !== "Invalid date") {
        stamps.push({
          date,
          type: "passport_stamp",
          source: "passport_scan",
          rawText: match[0],
        });
      }
    }
  });

  return stamps;
}

function extractFlightDetails(flightData) {
  // Implement flight detail extraction logic
  const flights = [];

  if (flightData && flightData.entities) {
    flightData.entities.forEach((entity) => {
      if (entity.type === "DATE" || entity.type === "LOCATION") {
        flights.push({
          date: entity.mentionText,
          type: "flight",
          source: "email",
          rawText: entity.mentionText,
        });
      }
    });
  }

  return flights;
}

async function generatePDFReport(travelHistory) {
  const jsPDF = require("jspdf");
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.text("Travel History Report", 20, 30);
  doc.text("For USCIS Citizenship Application", 20, 40);

  // Add travel entries
  let yPosition = 60;
  travelHistory.entries.forEach((entry, index) => {
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${entry.date} - ${entry.country || "Unknown"} (${entry.type})`, 20, yPosition);
    yPosition += 10;

    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
  });

  return doc.output("datauristring");
}

async function generateJSONReport(travelHistory) {
  return {
    reportType: "USCIS Travel History",
    generatedAt: new Date().toISOString(),
    summary: {
      totalTrips: travelHistory.totalTrips,
      countries: travelHistory.countries,
      dateRange: travelHistory.dateRange,
    },
    entries: travelHistory.entries,
  };
}
