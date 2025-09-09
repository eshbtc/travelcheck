# TravelCheck - Environment Variables Setup (2025)

This document explains the modern 2025 approaches for managing environment variables in Next.js applications on Firebase.

## 🚀 **Option 1: Firebase App Hosting (Recommended - Modern 2025)**

Firebase App Hosting is the new, modern way to deploy Next.js applications with proper environment variable management.

### **Setup Steps:**

1. **Create `apphosting.yaml`** (already created in project root)
2. **Set up secrets in Google Cloud Secret Manager:**

```bash
# Run the setup script
./scripts/setup-firebase-secrets.sh

# Or manually set each secret:
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# ... (see script for full list)
```

3. **Deploy to Firebase App Hosting:**

```bash
# Create new backend
firebase apphosting:backends:create

# Or deploy to existing backend
firebase apphosting:backends:deploy
```

### **Benefits:**
- ✅ Secure secret management with Google Cloud Secret Manager
- ✅ No environment files needed in repository
- ✅ Automatic secret rotation support
- ✅ IAM-based access control
- ✅ Audit logging for secret access

## 🔧 **Option 2: Traditional Firebase Hosting (Current Setup)**

For your current setup, you can continue using traditional Firebase Hosting with environment files.

### **Current Approach:**
- Uses `.env.local` for local development
- Environment variables are built into the static files during build
- Deployed via `firebase deploy --only hosting`

### **Limitations:**
- ❌ Environment variables are embedded in the build
- ❌ No secure secret management
- ❌ Requires rebuilding to change environment variables

## 📋 **Environment Variables Reference**

### **Firebase Configuration (Public - Safe to expose)**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCz_VGAx0W2Xkbt3krHDKqma7EkmjlqmwE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=travelcheck-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=travelcheck-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=travelcheck-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=981756606771
NEXT_PUBLIC_FIREBASE_APP_ID=1:981756606771:web:4b2bffe7f62d446561e646
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-N265JCR2HG
```

### **Application Configuration**
```env
GOOGLE_CLOUD_PROJECT_ID=travelcheck-app
NEXT_PUBLIC_ADMIN_EMAILS=hello@travelcheck.xyz
NEXT_PUBLIC_APP_URL=https://travelcheck-app.web.app
NEXT_PUBLIC_API_URL=https://us-central1-travelcheck-app.cloudfunctions.net
NEXT_PUBLIC_APP_ENV=production
```

## 🔄 **Migration Path**

### **From Traditional to App Hosting:**

1. **Keep current setup working** (traditional Firebase Hosting)
2. **Set up Firebase App Hosting** in parallel
3. **Test App Hosting deployment**
4. **Switch DNS/domain** when ready
5. **Decommission traditional hosting**

### **Immediate Action (No Migration Required):**

Your current setup is working fine. The environment variables are already properly configured in `.env.local` and the application is deployed successfully.

## 🛡️ **Security Best Practices (2025)**

1. **Use `NEXT_PUBLIC_` prefix only for non-sensitive data**
2. **Store sensitive data in Google Cloud Secret Manager**
3. **Never commit `.env.local` files to version control**
4. **Use environment-specific configurations**
5. **Implement secret rotation policies**
6. **Monitor secret access with audit logs**

## 📚 **Resources**

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## 🎯 **Recommendation**

For 2025, we recommend **Option 1 (Firebase App Hosting)** for new deployments, but your current setup is perfectly fine and working. You can migrate when convenient or when you need additional features like secret rotation.
