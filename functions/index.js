const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const documentai = require("@google-cloud/documentai");
const {google} = require("googleapis");
const sharp = require("sharp");
const crypto = require("crypto");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const logger = require("./utils/logger");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Google Cloud clients
const visionClient = new vision.ImageAnnotatorClient();
const documentClient = new documentai.DocumentProcessorServiceClient();

// Note: Express app removed - using callable functions instead

// Document AI configuration with environment variables
const DOC_AI_PROJECT = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT;
const DOC_AI_LOCATION = process.env.GOOGLE_CLOUD_DOCUMENT_AI_LOCATION || 'us';
const PASSPORT_PROCESSOR_ID = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PASSPORT_PROCESSOR_ID || process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;
const FLIGHT_PROCESSOR_ID = process.env.GOOGLE_CLOUD_DOCUMENT_AI_FLIGHT_PROCESSOR_ID || process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;

function getProcessorName(processorId) {
  if (!DOC_AI_PROJECT || !processorId) {
    return null;
  }
  return `projects/${DOC_AI_PROJECT}/locations/${DOC_AI_LOCATION}/processors/${processorId}`;
}

// App Check enforcement flag
const ENFORCE_APP_CHECK = (process.env.ENFORCE_APP_CHECK || "").toLowerCase() === "true";

function ensureAuthAndAppCheck(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
  if (ENFORCE_APP_CHECK && !context.app) {
    throw new functions.https.HttpsError("failed-precondition", "App Check token required");
  }
}

// Simple AES-256-GCM encryption for tokens at rest
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || "";
  // Derive 32-byte key from provided string
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    data: enc.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(obj) {
  if (!obj || !obj.iv || !obj.data || !obj.tag) return null;
  const iv = Buffer.from(obj.iv, "base64");
  const data = Buffer.from(obj.data, "base64");
  const tag = Buffer.from(obj.tag, "base64");
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

// MSAL cache helpers (persist per user)
async function loadMsalCache(cca, userId) {
  try {
    const doc = await admin.firestore().collection("email_accounts").doc(`${userId}_office365_msal_cache`).get();
    if (doc.exists && doc.data().cache) {
      const serialized = decrypt(doc.data().cache);
      if (serialized) {
        await cca.getTokenCache().deserialize(serialized);
      }
    }
  } catch (e) {
    functions.logger.warn("loadMsalCache failed", { error: e?.message });
  }
}

async function saveMsalCache(cca, userId) {
  try {
    const serialized = await cca.getTokenCache().serialize();
    const enc = encrypt(serialized);
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365_msal_cache`).set({ cache: enc }, { merge: true });
  } catch (e) {
    functions.logger.warn("saveMsalCache failed", { error: e?.message });
  }
}

/**
 * Gmail OAuth Functions
 */
exports.getGmailAuthUrl = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.labels"
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: context.auth.uid // Use user ID as state
    });

    return {
      success: true,
      authUrl
    };
  } catch (error) {
    logger.error("Error generating Gmail auth URL", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to generate auth URL");
  }
});

exports.handleGmailCallback = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const {code, state} = data;
    const userId = context.auth.uid;

    if (!code || state !== userId) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid authorization code or state");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // Exchange code for tokens
    const {tokens} = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens securely (encrypt)
    await admin.firestore().collection("email_accounts").doc(userId).set({
      userId,
      provider: "gmail",
      accessToken: encrypt(tokens.access_token || ""),
      refreshToken: encrypt(tokens.refresh_token || ""),
      tokenExpiry: tokens.expiry_date || null,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    return {
      success: true,
      message: "Gmail account connected successfully"
    };
  } catch (error) {
    logger.error("Error handling Gmail callback", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to connect Gmail account");
  }
});

exports.disconnectGmail = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const userId = context.auth.uid;

    // Remove Gmail account from Firestore
    await admin.firestore().collection("email_accounts").doc(userId).delete();

    return {
      success: true,
      message: "Gmail account disconnected successfully"
    };
  } catch (error) {
    logger.error("Error disconnecting Gmail", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to disconnect Gmail account");
  }
});

exports.getGmailConnectionStatus = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const userId = context.auth.uid;

    // Check if Gmail account is connected
    const emailAccountDoc = await admin.firestore().collection("email_accounts").doc(userId).get();
    
    if (emailAccountDoc.exists) {
      const accountData = emailAccountDoc.data();
      return {
        success: true,
        connected: true,
        provider: accountData.provider,
        connectedAt: accountData.connectedAt,
        isActive: accountData.isActive
      };
    } else {
      return {
        success: true,
        connected: false
      };
    }
  } catch (error) {
    logger.error("Error checking Gmail connection status", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to check connection status");
  }
});

/**
 * Gmail Sync - Server-side email parsing using stored refresh token
 */
exports.syncGmail = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);
    const userId = context.auth.uid;

    const emailDoc = await admin.firestore().collection("email_accounts").doc(userId).get();
    if (!emailDoc.exists || emailDoc.data().provider !== "gmail") {
      throw new functions.https.HttpsError("failed-precondition", "Gmail account not connected");
    }

    const { accessToken, refreshToken } = emailDoc.data();
    const rt = decrypt(refreshToken);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: rt });
    const { credentials } = await oauth2Client.refreshAccessToken();
    const at = credentials.access_token;

    // Use Gmail API to fetch messages
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const searchQuery = "subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)";
    const { data: list } = await gmail.users.messages.list({ userId: "me", q: searchQuery, maxResults: 50 });

    const flightEmails = [];
    const emailIds = [];
    if (list.messages && list.messages.length) {
      for (const m of list.messages) {
        const messageData = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
        const email = messageData.data;
        const headers = email.payload.headers;
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const from = headers.find((h) => h.name === "From")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";
        const emailContent = extractEmailContent(email.payload);

        const extractedFlights = await extractFlightInfo(emailContent);
        const flightData = {
          messageId: m.id,
          subject,
          from,
          date,
          content: emailContent,
          extractedFlights,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId,
        };
        flightEmails.push(flightData);
      }

      const batch = admin.firestore().batch();
      flightEmails.forEach((flight) => {
        const docRef = admin.firestore().collection("flight_emails").doc();
        emailIds.push(docRef.id);
        batch.set(docRef, flight);
      });
      await batch.commit();
    }

    return {
      success: true,
      count: flightEmails.length,
      emails: flightEmails.map((e, i) => ({ id: emailIds[i], ...e })),
    };
  } catch (error) {
    logger.error("Error syncing Gmail", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to sync Gmail emails");
  }
});

/**
 * Office365 OAuth Functions
 */
exports.getOffice365AuthUrl = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const msalConfig = {
      auth: {
        clientId: process.env.OFFICE365_CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        clientSecret: process.env.OFFICE365_CLIENT_SECRET,
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, context.auth.uid);
    const authCodeUrlParameters = {
      scopes: ["offline_access", "Mail.Read"],
      redirectUri: process.env.OFFICE365_REDIRECT_URI,
      state: context.auth.uid,
    };
    const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);

    return { success: true, authUrl };
  } catch (error) {
    logger.error("Error generating Office365 auth URL", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to generate auth URL");
  }
});

exports.handleOffice365Callback = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const {code, state} = data;
    const userId = context.auth.uid;

    if (!code || state !== userId) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid authorization code or state");
    }

    const msalConfig = {
      auth: {
        clientId: process.env.OFFICE365_CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        clientSecret: process.env.OFFICE365_CLIENT_SECRET,
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, userId);
    const tokenResponse = await cca.acquireTokenByCode({
      code,
      redirectUri: process.env.OFFICE365_REDIRECT_URI,
      scopes: ["offline_access", "Mail.Read"],
    });
    await saveMsalCache(cca, userId);

    // Store tokens securely in Firestore (encrypt refreshToken if available)
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).set({
      userId,
      provider: "office365",
      accessToken: encrypt(tokenResponse.accessToken || ""),
      refreshToken: tokenResponse.refreshToken ? encrypt(tokenResponse.refreshToken) : null,
      tokenExpiry: tokenResponse.expiresOn ? tokenResponse.expiresOn.getTime() : null,
      account: tokenResponse.account ? {
        homeAccountId: tokenResponse.account.homeAccountId,
        username: tokenResponse.account.username,
        environment: tokenResponse.account.environment,
        tenantId: tokenResponse.account.tenantId,
      } : null,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    return {
      success: true,
      message: "Office365 account connected successfully"
    };
  } catch (error) {
    logger.error("Error handling Office365 callback", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to connect Office365 account");
  }
});

exports.disconnectOffice365 = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const userId = context.auth.uid;

    // Remove Office365 account and MSAL cache from Firestore
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).delete();
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365_msal_cache`).delete();

    return {
      success: true,
      message: "Office365 account disconnected successfully"
    };
  } catch (error) {
    logger.error("Error disconnecting Office365", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to disconnect Office365 account");
  }
});

exports.getOffice365ConnectionStatus = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

    const userId = context.auth.uid;

    // Check if Office365 account is connected
    const emailAccountDoc = await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).get();
    
    if (emailAccountDoc.exists) {
      const accountData = emailAccountDoc.data();
      return {
        success: true,
        connected: true,
        provider: accountData.provider,
        connectedAt: accountData.connectedAt,
        isActive: accountData.isActive
      };
    } else {
      return {
        success: true,
        connected: false
      };
    }
  } catch (error) {
    logger.error("Error checking Office365 connection status", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to check connection status");
  }
});

/**
 * Office365 Sync - Server-side email parsing using MS Graph
 */
exports.syncOffice365 = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);
    const userId = context.auth.uid;

    const emailDoc = await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).get();
    if (!emailDoc.exists || emailDoc.data().provider !== "office365") {
      throw new functions.https.HttpsError("failed-precondition", "Office365 account not connected");
    }

    const msalConfig = {
      auth: {
        clientId: process.env.OFFICE365_CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        clientSecret: process.env.OFFICE365_CLIENT_SECRET,
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, userId);

    const accounts = await cca.getTokenCache().getAllAccounts();
    const selected = accounts && accounts.length ? accounts[0] : null;
    if (!selected) {
      throw new functions.https.HttpsError("failed-precondition", "Office365 session expired. Please reconnect.");
    }

    const silent = await cca.acquireTokenSilent({
      account: selected,
      scopes: ["Mail.Read"],
      forceRefresh: false,
    });
    await saveMsalCache(cca, userId);
    const accessToken = silent.accessToken;

    // Fetch messages from Graph
    const response = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Graph error: ${response.status} ${text}`);
    }
    const json = await response.json();
    const items = json.value || [];

    const flightEmails = [];
    const emailIds = [];
    for (const item of items) {
      const subject = item.subject || "";
      const from = item.from?.emailAddress?.address || "";
      const date = item.receivedDateTime || item.sentDateTime || "";
      const content = item.body?.content || "";
      const extractedFlights = await extractFlightInfo(content);
      const flightData = {
        messageId: item.id,
        subject,
        from,
        date,
        content,
        extractedFlights,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId,
      };
      flightEmails.push(flightData);
    }

    if (flightEmails.length) {
      const batch = admin.firestore().batch();
      flightEmails.forEach((flight) => {
        const docRef = admin.firestore().collection("flight_emails").doc();
        emailIds.push(docRef.id);
        batch.set(docRef, flight);
      });
      await batch.commit();
    }

    return {
      success: true,
      count: flightEmails.length,
      emails: flightEmails.map((e, i) => ({ id: emailIds[i], ...e })),
    };
  } catch (error) {
    logger.error("Error syncing Office365", { error: error?.message });
    throw new functions.https.HttpsError("internal", "Failed to sync Office365 emails");
  }
});

/**
 * OCR Function - Extract text from passport images
 */
exports.extractPassportData = functions.https.onCall(async (data, context) => {
  try {
    ensureAuthAndAppCheck(context);

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
    const passportProcessorName = getProcessorName(PASSPORT_PROCESSOR_ID);
    if (!passportProcessorName) {
      throw new functions.https.HttpsError("failed-precondition", "Document AI processor is not configured");
    }
    const [documentResult] = await documentClient.processDocument({
      name: passportProcessorName,
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
  const flightProcessorName = getProcessorName(FLIGHT_PROCESSOR_ID);
  if (!flightProcessorName) {
    throw new functions.https.HttpsError("failed-precondition", "Document AI processor is not configured");
  }
  const [result] = await documentClient.processDocument({
    name: flightProcessorName,
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
