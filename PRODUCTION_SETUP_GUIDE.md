# TravelCheck - Production Setup Guide (Deprecated)

This guide described the prior Firebase-based stack and is kept for reference. The project now uses Supabase + Next.js API routes. For current production setup, see docs/SUPABASE_SETUP.md.

## 🚀 **Production Environment Configuration**

This guide walks you through setting up the TravelCheck application for production deployment.

### **Prerequisites**

- Google Cloud Project with billing enabled
- Firebase project initialized
- Domain name for your application
- SSL certificate (handled by Firebase Hosting)

---

## **1. Google Cloud Project Setup**

### **1.1 Enable Required APIs**

```bash
# Enable required Google Cloud APIs
gcloud services enable vision.googleapis.com
gcloud services enable documentai.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable people.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable analytics.googleapis.com
```

### **1.2 Create Service Account**

```bash
# Create service account for Firebase Functions
gcloud iam service-accounts create travelcheck-functions \
    --description="Service account for TravelCheck Firebase Functions" \
    --display-name="TravelCheck Functions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:travelcheck-functions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:travelcheck-functions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/documentai.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:travelcheck-functions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firestore.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:travelcheck-functions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

### **1.3 Download Service Account Key**

```bash
# Download service account key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=travelcheck-functions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## **2. Firebase Configuration**

### **2.1 Set Firebase Environment Variables**

```bash
# Set Firebase Functions environment variables
firebase functions:config:set \
    gmail.client_id="YOUR_GMAIL_CLIENT_ID" \
    gmail.client_secret="YOUR_GMAIL_CLIENT_SECRET" \
    gmail.redirect_uri="https://your-domain.com/auth/oauth-callback?provider=gmail" \
    office365.client_id="YOUR_OFFICE365_CLIENT_ID" \
    office365.client_secret="YOUR_OFFICE365_CLIENT_SECRET" \
    office365.redirect_uri="https://your-domain.com/auth/oauth-callback?provider=office365" \
    google.cloud_project_id="YOUR_PROJECT_ID" \
    google.vision_api_key="YOUR_VISION_API_KEY" \
    google.document_ai_project_id="YOUR_PROJECT_ID" \
    google.document_ai_location="us" \
    google.document_ai_processor_id="YOUR_PROCESSOR_ID"
```

### **2.2 Set Firebase Secrets (Recommended)**

```bash
# Set sensitive data as secrets
firebase functions:secrets:set GMAIL_CLIENT_SECRET
firebase functions:secrets:set OFFICE365_CLIENT_SECRET
firebase functions:secrets:set GOOGLE_CLOUD_VISION_API_KEY
```

---

## **3. OAuth Application Setup**

### **3.1 Gmail OAuth Setup**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "OAuth 2.0 Client IDs"
4. Configure OAuth consent screen
5. Set authorized redirect URIs:
   - `https://your-domain.com/auth/oauth-callback?provider=gmail`
6. Note down Client ID and Client Secret

### **3.2 Office365 OAuth Setup**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure redirect URI:
   - `https://your-domain.com/auth/oauth-callback?provider=office365`
5. Add API permissions:
   - Microsoft Graph > Mail.Read
   - Microsoft Graph > Mail.ReadBasic
6. Note down Application (client) ID and Client Secret

---

## **4. Google Cloud Document AI Setup**

### **4.1 Create Document AI Processor**

```bash
# Create Document AI processor for passport processing
gcloud documentai processors create \
    --location=us \
    --display-name="TravelCheck Passport Processor" \
    --type=FORM_PARSER_PROCESSOR
```

### **4.2 Note Processor ID**

```bash
# List processors to get the processor ID
gcloud documentai processors list --location=us
```

---

## **5. Domain and SSL Setup**

### **5.1 Configure Custom Domain**

```bash
# Add custom domain to Firebase Hosting
firebase hosting:channel:deploy production --only hosting
```

### **5.2 SSL Certificate**

Firebase Hosting automatically provides SSL certificates for custom domains.

---

## **6. Environment Variables Configuration**

### **6.1 Frontend Environment Variables**

Create `.env.local` file in the `frontend` directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-region-your_project_id.cloudfunctions.net

# Development/Production Flags
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### **6.2 Firebase Functions Environment Variables**

The Firebase Functions will use the environment variables set via `firebase functions:config:set` and secrets via `firebase functions:secrets:set`.

---

## **7. Security Configuration**

### **7.1 Firestore Security Rules**

Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

### **7.2 Storage Security Rules**

Deploy the storage rules:

```bash
firebase deploy --only storage
```

### **7.3 Firebase App Check**

Enable Firebase App Check for additional security:

```bash
# Enable App Check in Firebase Console
# Go to Project Settings > App Check
# Enable App Check for your web app
```

---

## **8. Monitoring and Analytics Setup**

### **8.1 Firebase Analytics**

Firebase Analytics is automatically enabled when you add the Firebase SDK.

### **8.2 Firebase Crashlytics**

Enable Crashlytics in Firebase Console:
1. Go to Project Settings > Integrations
2. Enable Crashlytics

### **8.3 Firebase Performance**

Enable Performance Monitoring in Firebase Console:
1. Go to Project Settings > Integrations
2. Enable Performance Monitoring

---

## **9. Deployment**

### **9.1 Deploy Firebase Functions**

```bash
# Deploy all functions
firebase deploy --only functions
```

### **9.2 Deploy Frontend**

```bash
# Build and deploy frontend
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### **9.3 Deploy Everything**

```bash
# Deploy all services
firebase deploy
```

---

## **10. Post-Deployment Verification**

### **10.1 Health Checks**

1. Visit your domain to ensure the app loads
2. Test user registration and login
3. Test Gmail OAuth integration
4. Test Office365 OAuth integration
5. Test passport upload functionality
6. Test report generation

### **10.2 Monitoring**

1. Check Firebase Console for function logs
2. Monitor Firebase Analytics for user activity
3. Check Firebase Crashlytics for errors
4. Monitor Firebase Performance for performance metrics

---

## **11. Production Checklist**

- [ ] Google Cloud APIs enabled
- [ ] Service account created and configured
- [ ] Firebase environment variables set
- [ ] OAuth applications configured
- [ ] Document AI processor created
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Security rules deployed
- [ ] Firebase Functions deployed
- [ ] Frontend deployed
- [ ] Health checks passed
- [ ] Monitoring configured

---

## **12. Troubleshooting**

### **Common Issues**

1. **OAuth Redirect URI Mismatch**
   - Ensure redirect URIs match exactly in OAuth configuration

2. **Firebase Functions Timeout**
   - Check function logs in Firebase Console
   - Verify environment variables are set correctly

3. **CORS Issues**
   - Firebase Functions handle CORS automatically
   - Check if functions are deployed correctly

4. **Permission Denied Errors**
   - Verify service account has necessary permissions
   - Check Firestore security rules

### **Support Resources**

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)

---

**Last Updated:** December 2024
**Version:** 1.0.0
