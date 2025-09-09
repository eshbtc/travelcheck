const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function isAdmin(request) {
  if (!request || !request.auth) return false;
  const uid = request.auth.uid;
  let email = (request.auth.token && request.auth.token.email) || null;
  if (!email) {
    try {
      const user = await admin.auth().getUser(uid);
      email = user.email || null;
    } catch (e) {
      console.warn("isAdmin: failed to get user for email", {uid, error: e && e.message});
    }
  }
  const adminEmails = new Set(getAdminEmails());
  if (email && adminEmails.has(String(email).toLowerCase())) return true;
  try {
    const doc = await admin.firestore().collection("users").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      if (data && (data.role === "admin" || data.isAdmin === true)) return true;
    }
  } catch (e) {
    console.warn("isAdmin: failed to read user doc", {uid, error: e && e.message});
  }
  return false;
}

/**
 * Get User Profile
 */
exports.getUserProfile = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User profile not found");
    }

    return {
      success: true,
      user: userDoc.data(),
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw new HttpsError("internal", "Failed to get user profile");
  }
});

/**
 * Update User Profile
 */
exports.updateUserProfile = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {profileData} = request.data || {};

    await admin.firestore().collection("users").doc(userId).update({
      ...profileData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new HttpsError("internal", "Failed to update user profile");
  }
});

/**
 * Admin: Set User Role (admin/user)
 */
exports.setUserRole = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const allowed = await isAdmin(request);
    if (!allowed) {
      throw new HttpsError("permission-denied", "Admin privileges required");
    }
    const {targetUserId, role} = request.data || {};
    if (!targetUserId || (role !== "admin" && role !== "user")) {
      throw new HttpsError("invalid-argument", "Provide targetUserId and role in {admin|user}");
    }
    // Update Firestore user role
    await admin.firestore().collection("users").doc(targetUserId).set({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    // Optionally set custom claims
    try {
      await admin.auth().setCustomUserClaims(targetUserId, {role});
    } catch (e) {
      console.warn("setUserRole: failed to set custom claims", {targetUserId, error: e && e.message});
    }

    return {success: true, message: `Role for ${targetUserId} set to ${role}`};
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new HttpsError("internal", "Failed to set user role");
  }
});

/**
 * Admin: System Status
 */
exports.getAdminSystemStatus = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const allowed = await isAdmin(request);
    if (!allowed) {
      throw new HttpsError("permission-denied", "Admin privileges required");
    }

    // Simple connectivity checks and config hints
    await admin.firestore().collection("health_check").doc("test").get();
    const gmailConfigured = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
    const officeConfigured = !!(process.env.OFFICE365_CLIENT_ID && process.env.OFFICE365_CLIENT_SECRET);
    const docAiConfigured = !!(process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID || process.env.GOOGLE_CLOUD_DOCUMENT_AI_PASSPORT_PROCESSOR_ID);

    return {
      success: true,
      status: {
        firestore: "connected",
        node: process.versions.node,
        appCheck: {
          enforced: true,
          replayProtection: true,
        },
        config: {
          gmailConfigured,
          officeConfigured,
          docAiConfigured,
        },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error getting admin system status:", error);
    return {
      success: false,
      status: {
        firestore: "disconnected",
        error: error && error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
});

/**
 * Admin: List Users (from Firestore collection 'users')
 */
exports.listUsers = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const allowed = await isAdmin(request);
    if (!allowed) {
      throw new HttpsError("permission-denied", "Admin privileges required");
    }

    const snap = await admin.firestore().collection("users").orderBy("created_at", "desc").limit(500).get();
    const users = snap.docs.map((d) => ({id: d.id, ...d.data()}));
    return {success: true, users};
  } catch (error) {
    console.error("Error listing users:", error);
    throw new HttpsError("internal", "Failed to list users");
  }
});

/**
 * Get Travel History
 */
exports.getTravelHistory = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const travelHistoryDoc = await admin.firestore()
        .collection("travel_history")
        .doc(userId)
        .get();

    if (!travelHistoryDoc.exists) {
      return {
        success: true,
        travelHistory: null,
      };
    }

    return {
      success: true,
      travelHistory: travelHistoryDoc.data(),
    };
  } catch (error) {
    console.error("Error getting travel history:", error);
    throw new HttpsError("internal", "Failed to get travel history");
  }
});

/**
 * Get Passport Scans
 */
exports.getPassportScans = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const passportScans = await admin.firestore()
        .collection("passport_scans")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

    const scans = passportScans.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      scans,
    };
  } catch (error) {
    console.error("Error getting passport scans:", error);
    throw new HttpsError("internal", "Failed to get passport scans");
  }
});

/**
 * Get Flight Emails
 */
exports.getFlightEmails = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const flightEmails = await admin.firestore()
        .collection("flight_emails")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

    const emails = flightEmails.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      emails,
    };
  } catch (error) {
    console.error("Error getting flight emails:", error);
    throw new HttpsError("internal", "Failed to get flight emails");
  }
});

/**
 * Delete Passport Scan
 */
exports.deletePassportScan = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {scanId} = request.data || {};

    // Verify ownership
    const scanDoc = await admin.firestore()
        .collection("passport_scans")
        .doc(scanId)
        .get();

    if (!scanDoc.exists || scanDoc.data().userId !== userId) {
      throw new HttpsError("permission-denied", "Access denied");
    }

    await admin.firestore().collection("passport_scans").doc(scanId).delete();

    return {
      success: true,
      message: "Passport scan deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting passport scan:", error);
    throw new HttpsError("internal", "Failed to delete passport scan");
  }
});

/**
 * Delete Flight Email
 */
exports.deleteFlightEmail = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {emailId} = request.data || {};

    // Verify ownership
    const emailDoc = await admin.firestore()
        .collection("flight_emails")
        .doc(emailId)
        .get();

    if (!emailDoc.exists || emailDoc.data().userId !== userId) {
      throw new HttpsError("permission-denied", "Access denied");
    }

    await admin.firestore().collection("flight_emails").doc(emailId).delete();

    return {
      success: true,
      message: "Flight email deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting flight email:", error);
    throw new HttpsError("internal", "Failed to delete flight email");
  }
});

/**
 * Health Check
 */
exports.healthCheck = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  return {
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
});

/**
 * Get System Status
 */
exports.getSystemStatus = onCall({enforceAppCheck: true, consumeAppCheckToken: true}, async (request) => {
  try {
    // Check Firestore connection
    await admin.firestore().collection("health_check").doc("test").get();

    return {
      success: true,
      status: {
        firestore: "connected",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    };
  } catch (error) {
    console.error("Error getting system status:", error);
    return {
      success: false,
      status: {
        firestore: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
});
