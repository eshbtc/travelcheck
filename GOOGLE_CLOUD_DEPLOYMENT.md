# Google Cloud Deployment Guide - Travel History Tracker

## 🚀 Complete Google Cloud Deployment

This guide will help you deploy the Travel History Tracker to Google Cloud Platform using Firebase, Cloud Run, and Google AI services.

## 📋 Prerequisites

- **Google Cloud Account** with billing enabled
- **Firebase Project** created
- **Google Cloud SDK** installed
- **Firebase CLI** installed
- **Docker** installed
- **Node.js 18+** installed

## 🛠️ Setup Instructions

### 1. Google Cloud Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  vision.googleapis.com \
  aiplatform.googleapis.com \
  firebase.googleapis.com
```

### 2. Firebase Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select the following services:
# - Firestore
# - Hosting
# - Storage
# - Functions (optional)
```

### 3. Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create travel-history-sa \
  --display-name="Travel History Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:travel-history-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:travel-history-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:travel-history-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:travel-history-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download service account key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=travel-history-sa@$PROJECT_ID.iam.gserviceaccount.com
```

### 4. Google Cloud Storage Setup

```bash
# Create storage bucket
gsutil mb gs://$PROJECT_ID-travel-history-uploads

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-travel-history-uploads
```

### 5. Environment Configuration

```bash
# Copy environment files
cp env.example .env
cp frontend/env.example frontend/.env.local

# Update .env with your values
# - GOOGLE_CLOUD_PROJECT
# - FIREBASE_PROJECT_ID
# - FIREBASE_PRIVATE_KEY (from service account key)
# - FIREBASE_CLIENT_EMAIL
# - GCS_BUCKET_NAME
# - GMAIL_CLIENT_ID/SECRET
# - OFFICE365_CLIENT_ID/SECRET
```

### 6. Frontend Environment Configuration

```bash
# Update frontend/.env.local with Firebase config
# Get these values from Firebase Console > Project Settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 🚀 Deployment

### Option 1: Manual Deployment

#### Deploy Backend to Cloud Run

```bash
# Build and push Docker image
cd backend
docker build -t gcr.io/$PROJECT_ID/travel-history-backend .
docker push gcr.io/$PROJECT_ID/travel-history-backend

# Deploy to Cloud Run
gcloud run deploy travel-history-backend \
  --image gcr.io/$PROJECT_ID/travel-history-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10
```

#### Deploy Frontend to Firebase Hosting

```bash
# Build frontend
cd frontend
npm install
npm run build
npm run export

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Deploy Firestore Rules

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

### Option 2: Automated Deployment with Cloud Build

```bash
# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

### Option 3: GitHub Actions (Recommended)

1. **Set up GitHub Secrets:**
   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCP_SA_KEY`: Service account key JSON
   - `FIREBASE_TOKEN`: Firebase CI token

2. **Get Firebase CI Token:**
   ```bash
   firebase login:ci
   ```

3. **Push to main branch** - deployment will happen automatically

## 🔧 Configuration

### Firebase Authentication Setup

1. **Enable Authentication Providers:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google (optional)

2. **Configure App Check:**
   - Go to Firebase Console > App Check
   - Register your app
   - Set up reCAPTCHA v3

### Firestore Security Rules

The security rules are already configured in `firestore.rules`:
- Users can only access their own data
- All operations require authentication
- Proper validation for data structure

### Google Cloud Vision API

1. **Enable Vision API:**
   ```bash
   gcloud services enable vision.googleapis.com
   ```

2. **Set up billing** for Vision API usage

### Vertex AI / Google AI Studio

1. **Enable Vertex AI:**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

2. **Set up Vertex AI** in the Google Cloud Console

## 🧪 Testing Deployment

### 1. Test Backend API

```bash
# Get the Cloud Run URL
BACKEND_URL=$(gcloud run services describe travel-history-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)')

# Test health endpoint
curl $BACKEND_URL/health

# Test API documentation
open $BACKEND_URL/docs
```

### 2. Test Frontend

```bash
# Get the Firebase Hosting URL
FRONTEND_URL=$(firebase hosting:sites:list --json | jq -r '.[0].url')

# Open in browser
open $FRONTEND_URL
```

### 3. Test Firebase Authentication

1. Go to your frontend URL
2. Try to register a new account
3. Check Firebase Console > Authentication > Users

### 4. Test Firestore

1. Create a user account
2. Check Firebase Console > Firestore Database
3. Verify user document was created

## 📊 Monitoring and Logging

### Cloud Run Logs

```bash
# View logs
gcloud logs read --service=travel-history-backend --limit=50
```

### Firebase Analytics

1. Go to Firebase Console > Analytics
2. View user engagement metrics

### Error Monitoring

1. Go to Firebase Console > Crashlytics
2. Monitor application errors

## 🔒 Security Best Practices

### 1. Environment Variables

- Never commit `.env` files
- Use Google Secret Manager for sensitive data
- Rotate service account keys regularly

### 2. Firestore Security

- Rules are configured to prevent unauthorized access
- All operations require authentication
- Data validation on both client and server

### 3. App Check

- Protects against abuse
- Verifies requests come from your app
- Configured with reCAPTCHA v3

### 4. CORS Configuration

- Restricted to your Firebase hosting domains
- No wildcard origins allowed

## 🚨 Troubleshooting

### Common Issues

**1. Firebase Authentication Not Working**
```bash
# Check Firebase config
firebase projects:list
firebase use --add
```

**2. Cloud Run Deployment Fails**
```bash
# Check logs
gcloud logs read --service=travel-history-backend --limit=100
```

**3. Firestore Permission Denied**
- Check security rules
- Verify user is authenticated
- Check Firebase project configuration

**4. Vision API Quota Exceeded**
- Check billing is enabled
- Monitor API usage in Google Cloud Console
- Consider implementing rate limiting

### Debug Commands

```bash
# Check Cloud Run service status
gcloud run services list

# Check Firebase project status
firebase projects:list

# Check Firestore data
firebase firestore:get /users

# Check storage bucket
gsutil ls gs://$PROJECT_ID-travel-history-uploads
```

## 📈 Scaling and Optimization

### Performance Optimization

1. **Cloud Run:**
   - Set appropriate memory and CPU limits
   - Use connection pooling
   - Implement caching

2. **Firestore:**
   - Use composite indexes
   - Implement pagination
   - Optimize queries

3. **Storage:**
   - Use CDN for static assets
   - Compress images
   - Implement cleanup policies

### Cost Optimization

1. **Monitor Usage:**
   - Set up billing alerts
   - Monitor API quotas
   - Use Cloud Monitoring

2. **Optimize Resources:**
   - Right-size Cloud Run instances
   - Use Firestore pricing tiers
   - Implement data retention policies

## 🎯 Next Steps

1. **Set up monitoring** with Google Cloud Monitoring
2. **Configure alerts** for errors and performance
3. **Implement CI/CD** with GitHub Actions
4. **Set up staging environment**
5. **Configure custom domain** for production

## 📚 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)

---

**Your Travel History Tracker is now deployed on Google Cloud! 🎉**

For support or questions, check the troubleshooting section or create an issue in the repository.
