const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const moment = require("moment");
const _ = require("lodash");

/**
 * Travel History Analysis - Cross-reference passport stamps with flight data
 */
exports.analyzeTravelHistory = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;

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

    return {
      success: true,
      travelHistory,
    };
  } catch (error) {
    console.error("Error analyzing travel history:", error);
    throw new HttpsError("internal", "Failed to analyze travel history");
  }
});

/**
 * Generate USCIS Report - Create formatted travel history report
 */
exports.generateUSCISReport = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {format = "pdf"} = request.data || {};
    const userId = request.auth.uid;

    // Get travel history
    const travelHistoryDoc = await admin.firestore()
        .collection("travel_history")
        .doc(userId)
        .get();

    if (!travelHistoryDoc.exists) {
      throw new HttpsError("not-found", "Travel history not found");
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
    const reportRef = await admin.firestore()
        .collection("reports")
        .add({
          userId,
          format,
          data: reportData,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    return {
      success: true,
      report: {
        id: reportRef.id,
        ...reportData,
      },
    };
  } catch (error) {
    console.error("Error generating USCIS report:", error);
    throw new HttpsError("internal", "Failed to generate report");
  }
});

/**
 * Shared implementation for daily email sync
 */
async function performDailyEmailSync() {
  console.log("Running daily email sync...");
  // Get all users with Gmail integration
  const usersSnap = await admin.firestore()
      .collection("users")
      .where("gmailEnabled", "==", true)
      .get();

  let processed = 0;
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    try {
      // TODO: Call callable syncGmail or enqueue per-user sync here
      console.log(`Would sync emails for user ${user.uid}`);
      processed += 1;
    } catch (error) {
      console.error(`Error syncing emails for user ${user.uid}:`, error);
    }
  }
  return {usersChecked: usersSnap.size, processed};
}

/**
 * Scheduled Function - Daily email sync (kept as scheduled to avoid trigger-type conflicts)
 */
exports.dailyEmailSync = functions.scheduler.onSchedule("0 9 * * *", async (event) => {
  await performDailyEmailSync();
  return null;
});

/**
 * Optional callable to trigger the daily sync on demand (different name to avoid conflicts)
 */
exports.runDailyEmailSync = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  const isEmulator = (process.env.FUNCTIONS_EMULATOR === "true");
  if (!isEmulator && !request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const result = await performDailyEmailSync();
  return {success: true, ...result};
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

  // Country patterns (for future use)
  // const countryPatterns = [
  //   /(?:ENTRY|EXIT|ARRIVAL|DEPARTURE)\s+([A-Z\s]+)/gi,
  //   /([A-Z]{2,3})\s+(?:AIRPORT|PORT|BORDER)/gi,
  // ];

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
