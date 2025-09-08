const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Get User Profile
 */
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    return {
      success: true,
      user: userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user profile');
  }
});

/**
 * Update User Profile
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { profileData } = data;

    await admin.firestore().collection('users').doc(userId).update({
      ...profileData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user profile');
  }
});

/**
 * Get Travel History
 */
exports.getTravelHistory = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const travelHistoryDoc = await admin.firestore()
      .collection('travel_history')
      .doc(userId)
      .get();

    if (!travelHistoryDoc.exists) {
      return {
        success: true,
        travelHistory: null
      };
    }

    return {
      success: true,
      travelHistory: travelHistoryDoc.data()
    };
  } catch (error) {
    console.error('Error getting travel history:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get travel history');
  }
});

/**
 * Get Passport Scans
 */
exports.getPassportScans = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const passportScans = await admin.firestore()
      .collection('passport_scans')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    const scans = passportScans.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      scans
    };
  } catch (error) {
    console.error('Error getting passport scans:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get passport scans');
  }
});

/**
 * Get Flight Emails
 */
exports.getFlightEmails = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const flightEmails = await admin.firestore()
      .collection('flight_emails')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    const emails = flightEmails.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      emails
    };
  } catch (error) {
    console.error('Error getting flight emails:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get flight emails');
  }
});

/**
 * Delete Passport Scan
 */
exports.deletePassportScan = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { scanId } = data;

    // Verify ownership
    const scanDoc = await admin.firestore()
      .collection('passport_scans')
      .doc(scanId)
      .get();

    if (!scanDoc.exists || scanDoc.data().userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    await admin.firestore().collection('passport_scans').doc(scanId).delete();

    return {
      success: true,
      message: 'Passport scan deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting passport scan:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete passport scan');
  }
});

/**
 * Delete Flight Email
 */
exports.deleteFlightEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { emailId } = data;

    // Verify ownership
    const emailDoc = await admin.firestore()
      .collection('flight_emails')
      .doc(emailId)
      .get();

    if (!emailDoc.exists || emailDoc.data().userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    await admin.firestore().collection('flight_emails').doc(emailId).delete();

    return {
      success: true,
      message: 'Flight email deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting flight email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete flight email');
  }
});

/**
 * Health Check
 */
exports.healthCheck = functions.https.onCall(async (data, context) => {
  return {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

/**
 * Get System Status
 */
exports.getSystemStatus = functions.https.onCall(async (data, context) => {
  try {
    // Check Firestore connection
    const testDoc = await admin.firestore().collection('health_check').doc('test').get();
    
    return {
      success: true,
      status: {
        firestore: 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      success: false,
      status: {
        firestore: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
});
