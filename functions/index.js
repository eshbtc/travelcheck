const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const vision = require("@google-cloud/vision");
const documentai = require("@google-cloud/documentai");
const {google} = require("googleapis");
const axios = require("axios");
const sharp = require("sharp");
const {PDFDocument} = require("pdf-lib");
const jsPDF = require("jspdf");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const cron = require("node-cron");
const moment = require("moment");
const _ = require("lodash");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Google Cloud clients
const visionClient = new vision.ImageAnnotatorClient();
const documentClient = new documentai.DocumentProcessorServiceClient();

// Express app for HTTP functions
const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Multer for file uploads
const upload = multer({storage: multer.memoryStorage()});

/**
 * OCR Function - Extract text from passport images
 */
exports.extractPassportData = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
  cors: true,
}, async (req, res) => {
  try {
    const {imageData, userId} = req.body;

    if (!imageData || !userId) {
      return res.status(400).json({error: "Missing required fields"});
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
    await admin.firestore()
        .collection("passport_scans")
        .add(passportData);

    res.json({
      success: true,
      data: passportData,
    });
  } catch (error) {
    console.error("Error extracting passport data:", error);
    res.status(500).json({error: "Failed to extract passport data"});
  }
});

/**
 * Gmail Integration - Parse flight confirmation emails
 */
exports.parseGmailEmails = onRequest({
  timeoutSeconds: 300,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const {accessToken, userId} = req.body;

    if (!accessToken || !userId) {
      return res.status(400).json({error: "Missing access token or user ID"});
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
    flightEmails.forEach((flight) => {
      const docRef = admin.firestore()
          .collection("flight_emails")
          .doc();
      batch.set(docRef, flight);
    });
    await batch.commit();

    res.json({
      success: true,
      count: flightEmails.length,
      emails: flightEmails,
    });
  } catch (error) {
    console.error("Error parsing Gmail emails:", error);
    res.status(500).json({error: "Failed to parse Gmail emails"});
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

// Export the Express app for HTTP functions
exports.api = onRequest({
  timeoutSeconds: 300,
  memory: "512MiB",
  cors: true,
}, app);
