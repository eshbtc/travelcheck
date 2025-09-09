const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

// Set global options for CORS
setGlobalOptions({
  cors: true,
  region: "us-central1",
});
const vision = require("@google-cloud/vision");
const documentai = require("@google-cloud/documentai");
const {google} = require("googleapis");
const sharp = require("sharp");
const crypto = require("crypto");
const {ConfidentialClientApplication} = require("@azure/msal-node");
const logger = require("./utils/logger");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Google Cloud clients
const visionClient = new vision.ImageAnnotatorClient();
const documentClient = new documentai.DocumentProcessorServiceClient();

// Note: Express app removed - using callable functions instead

// Env/config helpers (support both process.env and functions.config())
function getConfigValue(category, key) {
  try {
    if (functions.config && typeof functions.config === "function") {
      const cfg = functions.config();
      if (cfg && cfg[category] && Object.prototype.hasOwnProperty.call(cfg[category], key)) {
        return cfg[category][key];
      }
    }
  } catch (e) {
    // Ignore config errors - fallback to undefined
  }
  return undefined;
}

function envOrConfig(envName, category, key) {
  return process.env[envName] || getConfigValue(category, key);
}

// Document AI configuration with environment variables (fallback to functions.config())
const DOC_AI_PROJECT = envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_PROJECT_ID", "google", "document_ai_project_id") || process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT;
const DOC_AI_LOCATION = envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_LOCATION", "google", "document_ai_location") || "us";
const PASSPORT_PROCESSOR_ID = envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_PASSPORT_PROCESSOR_ID", "google", "document_ai_passport_processor_id") || envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID", "google", "document_ai_processor_id");
const FLIGHT_PROCESSOR_ID = envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_FLIGHT_PROCESSOR_ID", "google", "document_ai_flight_processor_id") || envOrConfig("GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID", "google", "document_ai_processor_id");

function getProcessorName(processorId) {
  if (!DOC_AI_PROJECT || !processorId) {
    return null;
  }
  return `projects/${DOC_AI_PROJECT}/locations/${DOC_AI_LOCATION}/processors/${processorId}`;
}

// With v2 onCall, App Check is enforced via function options. Keep a helper for auth.
function ensureAuth(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
}

// Simple AES-256-GCM encryption for tokens at rest
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || getConfigValue("security", "encryption_key") || "";
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
    functions.logger.warn("loadMsalCache failed", {error: e && e.message});
  }
}

async function saveMsalCache(cca, userId) {
  try {
    const serialized = await cca.getTokenCache().serialize();
    const enc = encrypt(serialized);
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365_msal_cache`).set({cache: enc}, {merge: true});
  } catch (e) {
    functions.logger.warn("saveMsalCache failed", {error: e && e.message});
  }
}

/**
 * Gmail OAuth Functions
 */
exports.getGmailAuthUrl = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const oauth2Client = new google.auth.OAuth2(
        envOrConfig("GMAIL_CLIENT_ID", "gmail", "client_id"),
        envOrConfig("GMAIL_CLIENT_SECRET", "gmail", "client_secret"),
        envOrConfig("GMAIL_REDIRECT_URI", "gmail", "redirect_uri"),
    );

    const scopes = [
      // Modify allows read+labels + add/remove labels on messages (used to mark processed)
      "https://www.googleapis.com/auth/gmail.modify",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: request.auth.uid, // Use user ID as state
    });

    return {
      success: true,
      authUrl,
    };
  } catch (error) {
    logger.error("Error generating Gmail auth URL", {error: error && error.message});
    throw new HttpsError("internal", "Failed to generate auth URL");
  }
});

exports.handleGmailCallback = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const {code, state} = request.data || {};
    const userId = request.auth.uid;

    if (!code || state !== userId) {
      throw new HttpsError("invalid-argument", "Invalid authorization code or state");
    }

    const oauth2Client = new google.auth.OAuth2(
        envOrConfig("GMAIL_CLIENT_ID", "gmail", "client_id"),
        envOrConfig("GMAIL_CLIENT_SECRET", "gmail", "client_secret"),
        envOrConfig("GMAIL_REDIRECT_URI", "gmail", "redirect_uri"),
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
      isActive: true,
    });

    return {
      success: true,
      message: "Gmail account connected successfully",
    };
  } catch (error) {
    logger.error("Error handling Gmail callback", {error: error && error.message});
    throw new HttpsError("internal", "Failed to connect Gmail account");
  }
});

exports.disconnectGmail = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const userId = request.auth.uid;

    // Remove Gmail account from Firestore
    await admin.firestore().collection("email_accounts").doc(userId).delete();

    return {
      success: true,
      message: "Gmail account disconnected successfully",
    };
  } catch (error) {
    logger.error("Error disconnecting Gmail", {error: error && error.message});
    throw new HttpsError("internal", "Failed to disconnect Gmail account");
  }
});

exports.getGmailConnectionStatus = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const userId = request.auth.uid;

    // Check if Gmail account is connected
    const emailAccountDoc = await admin.firestore().collection("email_accounts").doc(userId).get();

    if (emailAccountDoc.exists) {
      const accountData = emailAccountDoc.data();
      return {
        success: true,
        connected: true,
        provider: accountData.provider,
        connectedAt: accountData.connectedAt,
        isActive: accountData.isActive,
      };
    } else {
      return {
        success: true,
        connected: false,
      };
    }
  } catch (error) {
    logger.error("Error checking Gmail connection status", {error: error && error.message});
    throw new HttpsError("internal", "Failed to check connection status");
  }
});

/**
 * Gmail Sync - Server-side email parsing using stored refresh token
 */
exports.syncGmail = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);
    const userId = request.auth.uid;

    const emailDoc = await admin.firestore().collection("email_accounts").doc(userId).get();
    if (!emailDoc.exists || emailDoc.data().provider !== "gmail") {
      throw new HttpsError("failed-precondition", "Gmail account not connected");
    }

    const {refreshToken} = emailDoc.data();
    const rt = decrypt(refreshToken);

    const oauth2Client = new google.auth.OAuth2(
        envOrConfig("GMAIL_CLIENT_ID", "gmail", "client_id"),
        envOrConfig("GMAIL_CLIENT_SECRET", "gmail", "client_secret"),
        envOrConfig("GMAIL_REDIRECT_URI", "gmail", "redirect_uri"),
    );

    oauth2Client.setCredentials({refresh_token: rt});
    await oauth2Client.refreshAccessToken();

    // Use Gmail API to fetch messages
    const gmail = google.gmail({version: "v1", auth: oauth2Client});
    const searchQuery = "subject:(confirmation OR booking OR ticket OR flight) (airline OR travel)";
    const {data: list} = await gmail.users.messages.list({userId: "me", q: searchQuery, maxResults: 50});
    // Prepare processed label
    const processedLabelId = await ensureGmailLabel(gmail, "TravelCheck/Processed");

    const flightEmails = [];
    const emailIds = [];
    if (list.messages && list.messages.length) {
      for (const m of list.messages) {
        const messageData = await gmail.users.messages.get({userId: "me", id: m.id, format: "full"});
        const email = messageData.data;
        const headers = email.payload.headers;
        const subject = (headers.find((h) => h.name === "Subject") && headers.find((h) => h.name === "Subject").value) || "";
        const from = (headers.find((h) => h.name === "From") && headers.find((h) => h.name === "From").value) || "";
        const date = (headers.find((h) => h.name === "Date") && headers.find((h) => h.name === "Date").value) || "";
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
        // Mark message as processed (best effort)
        await labelGmailMessageProcessed(gmail, m.id, processedLabelId);
      }

      const batch = admin.firestore().batch();
      flightEmails.forEach((flight) => {
        const docId = `${userId}_${flight.messageId}`;
        const docRef = admin.firestore().collection("flight_emails").doc(docId);
        emailIds.push(docId);
        batch.set(docRef, flight, {merge: true});
      });
      await batch.commit();
    }

    return {
      success: true,
      count: flightEmails.length,
      emails: flightEmails.map((e, i) => ({id: emailIds[i], ...e})),
    };
  } catch (error) {
    logger.error("Error syncing Gmail", {error: error && error.message});
    throw new HttpsError("internal", "Failed to sync Gmail emails");
  }
});

/**
 * Office365 OAuth Functions
 */
exports.getOffice365AuthUrl = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const msalConfig = {
      auth: {
        clientId: envOrConfig("OFFICE365_CLIENT_ID", "office365", "client_id"),
        authority: "https://login.microsoftonline.com/common",
        clientSecret: envOrConfig("OFFICE365_CLIENT_SECRET", "office365", "client_secret"),
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, request.auth.uid);
    const authCodeUrlParameters = {
      scopes: ["offline_access", "Mail.ReadWrite"],
      redirectUri: envOrConfig("OFFICE365_REDIRECT_URI", "office365", "redirect_uri"),
      state: request.auth.uid,
    };
    const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);

    return {success: true, authUrl};
  } catch (error) {
    logger.error("Error generating Office365 auth URL", {error: error && error.message});
    throw new HttpsError("internal", "Failed to generate auth URL");
  }
});

exports.handleOffice365Callback = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const {code, state} = request.data || {};
    const userId = request.auth.uid;

    if (!code || state !== userId) {
      throw new HttpsError("invalid-argument", "Invalid authorization code or state");
    }

    const msalConfig = {
      auth: {
        clientId: envOrConfig("OFFICE365_CLIENT_ID", "office365", "client_id"),
        authority: "https://login.microsoftonline.com/common",
        clientSecret: envOrConfig("OFFICE365_CLIENT_SECRET", "office365", "client_secret"),
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, userId);
    const tokenResponse = await cca.acquireTokenByCode({
      code,
      redirectUri: envOrConfig("OFFICE365_REDIRECT_URI", "office365", "redirect_uri"),
      scopes: ["offline_access", "Mail.ReadWrite"],
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
      isActive: true,
    });

    return {
      success: true,
      message: "Office365 account connected successfully",
    };
  } catch (error) {
    logger.error("Error handling Office365 callback", {error: error && error.message});
    throw new HttpsError("internal", "Failed to connect Office365 account");
  }
});

exports.disconnectOffice365 = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const userId = request.auth.uid;

    // Remove Office365 account and MSAL cache from Firestore
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).delete();
    await admin.firestore().collection("email_accounts").doc(`${userId}_office365_msal_cache`).delete();

    return {
      success: true,
      message: "Office365 account disconnected successfully",
    };
  } catch (error) {
    logger.error("Error disconnecting Office365", {error: error && error.message});
    throw new HttpsError("internal", "Failed to disconnect Office365 account");
  }
});

exports.getOffice365ConnectionStatus = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const userId = request.auth.uid;

    // Check if Office365 account is connected
    const emailAccountDoc = await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).get();

    if (emailAccountDoc.exists) {
      const accountData = emailAccountDoc.data();
      return {
        success: true,
        connected: true,
        provider: accountData.provider,
        connectedAt: accountData.connectedAt,
        isActive: accountData.isActive,
      };
    } else {
      return {
        success: true,
        connected: false,
      };
    }
  } catch (error) {
    logger.error("Error checking Office365 connection status", {error: error && error.message});
    throw new HttpsError("internal", "Failed to check connection status");
  }
});

/**
 * Office365 Sync - Server-side email parsing using MS Graph
 */
exports.syncOffice365 = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);
    const userId = request.auth.uid;

    const emailDoc = await admin.firestore().collection("email_accounts").doc(`${userId}_office365`).get();
    if (!emailDoc.exists || emailDoc.data().provider !== "office365") {
      throw new HttpsError("failed-precondition", "Office365 account not connected");
    }

    const msalConfig = {
      auth: {
        clientId: envOrConfig("OFFICE365_CLIENT_ID", "office365", "client_id"),
        authority: "https://login.microsoftonline.com/common",
        clientSecret: envOrConfig("OFFICE365_CLIENT_SECRET", "office365", "client_secret"),
      },
    };
    const cca = new ConfidentialClientApplication(msalConfig);
    await loadMsalCache(cca, userId);

    const accounts = await cca.getTokenCache().getAllAccounts();
    const selected = accounts && accounts.length ? accounts[0] : null;
    if (!selected) {
      throw new HttpsError("failed-precondition", "Office365 session expired. Please reconnect.");
    }

    const silent = await cca.acquireTokenSilent({
      account: selected,
      scopes: ["Mail.ReadWrite"],
      forceRefresh: false,
    });
    await saveMsalCache(cca, userId);
    const accessToken = silent.accessToken;

    // Fetch messages from Graph
    const response = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=50", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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
      const from = (item.from && item.from.emailAddress && item.from.emailAddress.address) || "";
      const date = item.receivedDateTime || item.sentDateTime || "";
      const content = (item.body && item.body.content) || "";
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

      // Add category to processed messages (best effort)
      try {
        const categories = Array.isArray(item.categories) ? item.categories.slice() : [];
        if (!categories.includes("TravelCheck/Processed")) {
          const updated = categories.concat(["TravelCheck/Processed"]);
          const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${item.id}`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({categories: updated}),
          });
          if (!patchRes.ok) {
            const txt = await patchRes.text();
            functions.logger.warn("Office365 category patch failed", {status: patchRes.status, txt});
          }
        }
      } catch (e) {
        functions.logger.warn("Office365 category update error", {error: e && e.message});
      }
    }

    if (flightEmails.length) {
      const batch = admin.firestore().batch();
      flightEmails.forEach((flight) => {
        const docId = `${userId}_${flight.messageId}`;
        const docRef = admin.firestore().collection("flight_emails").doc(docId);
        emailIds.push(docId);
        batch.set(docRef, flight, {merge: true});
      });
      await batch.commit();
    }

    return {
      success: true,
      count: flightEmails.length,
      emails: flightEmails.map((e, i) => ({id: emailIds[i], ...e})),
    };
  } catch (error) {
    logger.error("Error syncing Office365", {error: error && error.message});
    throw new HttpsError("internal", "Failed to sync Office365 emails");
  }
});

/**
 * OCR Function - Extract text from passport images
 */
exports.extractPassportData = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const {imageData} = request.data || {};
    const userId = request.auth.uid;

    if (!imageData) {
      throw new HttpsError("invalid-argument", "Missing image data");
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
      throw new HttpsError("failed-precondition", "Document AI processor is not configured");
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
    throw new HttpsError("internal", "Failed to extract passport data");
  }
});

/**
 * Gmail Integration - Parse flight confirmation emails
 */
exports.parseGmailEmails = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    ensureAuth(request);

    const {accessToken} = request.data || {};
    const userId = request.auth.uid;

    if (!accessToken) {
      throw new HttpsError("invalid-argument", "Missing access token");
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
      // Best effort: label processed if we have permissions
      try {
        const processedLabelId = await ensureGmailLabel(gmail, "TravelCheck/Processed");
        await labelGmailMessageProcessed(gmail, message.id, processedLabelId);
      } catch (e) {
        functions.logger.warn("parseGmailEmails: label failed", {messageId: message.id, error: e && e.message});
      }
    }

    // Save to Firestore
    const batch = admin.firestore().batch();
    const emailIds = [];
    flightEmails.forEach((flight) => {
      const docId = `${userId}_${flight.messageId}`;
      const docRef = admin.firestore()
          .collection("flight_emails")
          .doc(docId);
      emailIds.push(docId);
      batch.set(docRef, flight, {merge: true});
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
    throw new HttpsError("internal", "Failed to parse Gmail emails");
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
    throw new HttpsError("failed-precondition", "Document AI processor is not configured");
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

// Gmail helpers: ensure label exists and apply to messages
async function ensureGmailLabel(gmail, labelName) {
  try {
    const {data} = await gmail.users.labels.list({userId: "me"});
    const existing = (data.labels || []).find((l) => l.name === labelName);
    if (existing) return existing.id;
    const created = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    });
    return created.data.id;
  } catch (e) {
    functions.logger.warn("ensureGmailLabel failed", {error: e && e.message});
    return null;
  }
}

async function labelGmailMessageProcessed(gmail, messageId, labelId) {
  if (!labelId) return;
  try {
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {addLabelIds: [labelId]},
    });
  } catch (e) {
    functions.logger.warn("labelGmailMessageProcessed failed", {messageId, error: e && e.message});
  }
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
exports.setUserRole = userManagement.setUserRole;
exports.getAdminSystemStatus = userManagement.getAdminSystemStatus;
exports.listUsers = userManagement.listUsers;

// Note: Express app removed - all functions are now callable
