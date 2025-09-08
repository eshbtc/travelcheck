const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const documentai = require("@google-cloud/documentai");
const {google} = require("googleapis");
const sharp = require("sharp");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Google Cloud clients
const visionClient = new vision.ImageAnnotatorClient();
const documentClient = new documentai.DocumentProcessorServiceClient();

// Note: Express app removed - using callable functions instead

/**
 * OCR Function - Extract text from passport images
 */
exports.extractPassportData = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const {imageData} = data;
    const userId = context.auth.uid;

    if (!imageData) {
      throw new functions.https.HttpsError("invalid-argument", "Missing image data");
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, "base64");

    // Process image with Sharp for optimization
    const processedImage = await sharp(imageBuffer)
        .resize(2000, 2000, {fit: "inside", withoutEnlargement: true})
        .jpeg({quality: 90})
        .toBuffer();

    // Perform OCR with Google Vision API
    const [result] = await visionClient.textDetection({
      image: {content: processedImage},
    });

    const detections = result.textAnnotations;
    const extractedText = detections[0] ? detections[0].description : "";

    // Parse passport data using Document AI
    const [documentResult] = await documentClient.processDocument({
      name: "projects/travelcheck-app/locations/us/processors/PASSPORT_PROCESSOR",
      rawDocument: {
        content: processedImage,
        mimeType: "image/jpeg",
      },
    });

    const passportData = {
      extractedText,
      structuredData: documentResult.document,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
    };

    // Save to Firestore
    const docRef = await admin.firestore()
        .collection("passport_scans")
        .add(passportData);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...passportData,
      },
    };
  } catch (error) {
    console.error("Error extracting passport data:", error);
    throw new functions.https.HttpsError("internal", "Failed to extract passport data");
  }
});

/**
 * Gmail Integration - Parse flight confirmation emails
 */
exports.parseGmailEmails = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const {accessToken} = data;
    const userId = context.auth.uid;

    if (!accessToken) {
      throw new functions.https.HttpsError("invalid-argument", "Missing access token");
    }

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({access_token: accessToken});
    const gmail = google.gmail({version: "v1", auth: oauth2Client});

    // Search for flight confirmation emails
    const searchQuery = "subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)";
    const {data} = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: 50,
    });

    const flightEmails = [];

    for (const message of data.messages || []) {
      const messageData = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const email = messageData.data;
      const headers = email.payload.headers;

      const subject = headers.find((h) => h.name === "Subject") ? headers.find((h) => h.name === "Subject").value : "";
      const from = headers.find((h) => h.name === "From") ? headers.find((h) => h.name === "From").value : "";
      const date = headers.find((h) => h.name === "Date") ? headers.find((h) => h.name === "Date").value : "";

      // Extract flight information using Document AI
      const emailContent = extractEmailContent(email.payload);

      const flightData = {
        messageId: message.id,
        subject,
        from,
        date,
        content: emailContent,
        extractedFlights: await extractFlightInfo(emailContent),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId,
      };

      flightEmails.push(flightData);
    }

    // Save to Firestore
    const batch = admin.firestore().batch();
    const emailIds = [];
    flightEmails.forEach((flight) => {
      const docRef = admin.firestore()
          .collection("flight_emails")
          .doc();
      emailIds.push(docRef.id);
      batch.set(docRef, flight);
    });
    await batch.commit();

    return {
      success: true,
      count: flightEmails.length,
      emails: flightEmails.map((email, index) => ({
        id: emailIds[index],
        ...email,
      })),
    };
  } catch (error) {
    console.error("Error parsing Gmail emails:", error);
    throw new functions.https.HttpsError("internal", "Failed to parse Gmail emails");
  }
});

// Helper Functions
function extractEmailContent(payload) {
  let content = "";

  if (payload.body && payload.body.data) {
    content = Buffer.from(payload.body.data, "base64").toString();
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        content += Buffer.from(part.body.data, "base64").toString();
      }
    }
  }

  return content;
}

async function extractFlightInfo(emailContent) {
  // Use Document AI to extract structured flight information
  const [result] = await documentClient.processDocument({
    name: "projects/travelcheck-app/locations/us/processors/FLIGHT_PROCESSOR",
    rawDocument: {
      content: Buffer.from(emailContent),
      mimeType: "text/plain",
    },
  });

  return result.document;
}

// Import travel history functions
const travelHistory = require("./travelHistory");

// Import user management functions
const userManagement = require("./userManagement");

// Export travel history functions
exports.analyzeTravelHistory = travelHistory.analyzeTravelHistory;
exports.generateUSCISReport = travelHistory.generateUSCISReport;
exports.dailyEmailSync = travelHistory.dailyEmailSync;

// Export user management functions
exports.getUserProfile = userManagement.getUserProfile;
exports.updateUserProfile = userManagement.updateUserProfile;
exports.getTravelHistory = userManagement.getTravelHistory;
exports.getPassportScans = userManagement.getPassportScans;
exports.getFlightEmails = userManagement.getFlightEmails;
exports.deletePassportScan = userManagement.deletePassportScan;
exports.deleteFlightEmail = userManagement.deleteFlightEmail;
exports.healthCheck = userManagement.healthCheck;
exports.getSystemStatus = userManagement.getSystemStatus;

// Note: Express app removed - all functions are now callable
