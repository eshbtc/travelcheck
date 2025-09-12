# Production Deployment Guide for Travel Check

## Overview
This guide covers setting up all the required services and API keys for deploying Travel Check to production with full functionality.

## 1. Supabase Setup

### Database Schema
Run the database migrations in your Supabase SQL editor:
```sql
-- Copy and run the contents of supabase-schema.sql
```

### Storage Setup
Run the storage setup commands in your Supabase SQL editor:
```sql
-- Copy and run the contents of supabase-storage-setup.sql
```

### Environment Variables for Supabase
Add these to your deployment environment (Vercel/Netlify):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 2. Google Cloud Setup

### Required Services
Enable these Google Cloud services:
1. Document AI API
2. Vertex AI API  
3. Generative AI API (Gemini)
4. Cloud Storage (for Document AI processing)

### Service Account Setup
1. Create a service account in Google Cloud Console
2. Grant these roles:
   - Document AI API User
   - Vertex AI User
   - Generative AI User
   - Storage Object Viewer (if using Cloud Storage)
3. Generate and download the service account JSON key

### Environment Variables for Google Cloud
Add these to your deployment environment:

#### Method 1: Service Account JSON (Recommended)
```env
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project",...}
```

#### Method 2: Individual Keys (Alternative)
```env
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

#### Google AI (Gemini) API Key
```env
GOOGLE_AI_API_KEY=your-gemini-api-key-from-ai-studio
```

#### Document AI Processor
```env
DOCUMENT_AI_PROJECT_ID=your-google-cloud-project-id
DOCUMENT_AI_LOCATION=us  # or your preferred region
DOCUMENT_AI_PROCESSOR_ID=your-passport-processor-id
```

## 3. Document AI Processor Setup

### Create Passport Document Processor
1. Go to Google Cloud Console > Document AI
2. Create a new processor
3. Choose "Form Parser" or "Generic Document" processor
4. Note the Processor ID for environment variables

### Alternative: Custom Trained Processor
For better accuracy with passports:
1. Create a "Document OCR" processor
2. Train it with sample passport images
3. Deploy the trained model

## 4. Environment Variables Summary

Create a `.env.production` file with all required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Cloud - Service Account (choose one method)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account"...}
# OR
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
GOOGLE_CLOUD_CLIENT_EMAIL=service@project.iam.gserviceaccount.com

# Google AI (Gemini)
GOOGLE_AI_API_KEY=AIza...

# Document AI
DOCUMENT_AI_PROJECT_ID=your-project-id
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=your-processor-id

# Optional: Application Settings
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-for-production
```

## 5. Deployment Platforms

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on pushes to main branch

### Netlify
1. Build command: `npm run build`
2. Publish directory: `out` or `.next`
3. Add environment variables in Netlify dashboard

### Manual Deployment
```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## 6. Testing Production Setup

### Health Check Endpoints
Test these endpoints after deployment:
- `/api/health` - Basic health check
- `/api/ai/analyze-passport` - Document AI integration
- `/api/ai/generate-text` - Gemini AI integration

### Test Features
1. User registration/login
2. Passport upload and analysis
3. Travel history viewing
4. Report generation
5. Data export functionality

## 7. Security Considerations

### API Keys
- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Set up API key restrictions in Google Cloud

### Supabase Security
- Enable RLS on all tables
- Review storage policies
- Set up proper authentication flows
- Monitor usage and set limits

### CORS and Security Headers
Configure proper CORS settings and security headers for your domain.

## 8. Monitoring and Logging

### Google Cloud Monitoring
- Enable API usage monitoring
- Set up alerts for quota limits
- Monitor error rates

### Application Monitoring
- Use Vercel Analytics or similar
- Set up error tracking (Sentry, etc.)
- Monitor performance metrics

## 9. Troubleshooting

### Common Issues
1. **Authentication errors**: Check service account permissions
2. **Storage errors**: Verify RLS policies and bucket permissions
3. **API quota errors**: Check Google Cloud quotas and billing
4. **Build errors**: Ensure all environment variables are set

### Debug Mode
Set `DEBUG=true` in environment variables for detailed logging.

## 10. Production Checklist

- [ ] Supabase project created and configured
- [ ] Database schema deployed
- [ ] Storage buckets and policies set up
- [ ] Google Cloud project created
- [ ] Required APIs enabled
- [ ] Service account created with proper permissions
- [ ] Document AI processor created
- [ ] All environment variables configured
- [ ] Application deployed to hosting platform
- [ ] Health checks passing
- [ ] Core features tested
- [ ] Security review completed
- [ ] Monitoring set up

## Support

If you encounter issues during deployment:
1. Check the browser console for client-side errors
2. Check server logs for API errors
3. Verify all environment variables are correctly set
4. Test individual API endpoints
5. Check Google Cloud Console for service-specific errors