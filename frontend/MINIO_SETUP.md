# Minio Storage Setup Guide - Railway

This guide covers setting up Minio on Railway for storing passport images and documents.

## ✅ What You Have

You've already deployed a Minio service on Railway! Here's how to configure it properly.

---

## Step 1: Verify Minio Service

1. Go to [Railway Dashboard](https://railway.app/project/dd71bd50-adda-44ab-b23b-af2fd879b5bb)
2. You should see a **Minio** service in your project
3. Check that it's in **Running** state

---

## Step 2: Get Minio Credentials

Railway automatically provides these environment variables to **all services** in your project:

- `MINIO_ROOT_USER` - Admin username (usually "minioadmin")
- `MINIO_ROOT_PASSWORD` - Admin password
- `MINIO_HOST` - Internal hostname (e.g., "minio.railway.internal")
- `MINIO_PORT` - Port (usually "9000")

**Verify these exist:**
```bash
railway variables | grep MINIO
```

---

## Step 3: Access Minio Console

### Option A: Via Railway Public URL

1. Go to Minio service → **Settings** → **Networking**
2. Click **Generate Domain** to get a public URL
3. Copy the URL (e.g., `minio-production-xxxx.up.railway.app`)
4. Visit: `https://your-minio-url.up.railway.app`
5. Login with:
   - Username: Value of `MINIO_ROOT_USER`
   - Password: Value of `MINIO_ROOT_PASSWORD`

### Option B: Via Railway CLI (Port Forwarding)

```bash
# Link to your Minio service
railway service

# Select Minio service, then:
railway run --service minio bash

# Or use port forwarding
railway open minio
```

---

## Step 4: Create Bucket

1. **Login to Minio Console** (from Step 3)

2. **Create Bucket:**
   - Click **"Buckets"** in left sidebar
   - Click **"Create Bucket"** button
   - Bucket Name: `travel-check-uploads`
   - Click **"Create Bucket"**

3. **Set Bucket Policy (Make Public):**
   - Click on the `travel-check-uploads` bucket
   - Go to **"Access"** tab
   - Click **"Add Access Rule"**
   - Select **"Custom"**
   - Add this policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {"AWS": ["*"]},
         "Action": ["s3:GetObject"],
         "Resource": ["arn:aws:s3:::travel-check-uploads/*"]
       }
     ]
   }
   ```

   - Click **"Add"**

4. **Enable Versioning (Optional but recommended):**
   - Go to **"Summary"** tab
   - Enable **"Versioning"**

---

## Step 5: Configure Application to Use Minio

In your **web/frontend service**, add these environment variables:

### Required Variables

```bash
# S3-compatible configuration
S3_ENDPOINT=http://${MINIO_HOST}:${MINIO_PORT}
S3_ACCESS_KEY_ID=${MINIO_ROOT_USER}
S3_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
S3_BUCKET_NAME=travel-check-uploads
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

### Public URL (for serving images)

Get your Minio public URL from Step 3 and add:

```bash
S3_PUBLIC_URL=https://your-minio-url.up.railway.app
```

**Important:** Railway allows services to communicate internally using service names, so your app will use `http://${MINIO_HOST}:${MINIO_PORT}` for uploads, but serve images via the public URL.

---

## Step 6: Test Storage

### Test Upload (via your app)

1. Deploy your application
2. Login to your app
3. Try uploading a passport image
4. Check Minio console → `travel-check-uploads` bucket
5. You should see the uploaded file

### Test Via Minio Console

1. Go to Minio console
2. Click on `travel-check-uploads` bucket
3. Click **"Upload"** button
4. Upload a test image
5. Try accessing it via public URL:
   ```
   https://your-minio-url.up.railway.app/travel-check-uploads/your-file.jpg
   ```

---

## Storage Service Usage (Code Examples)

The storage service (`src/lib/storage.ts`) is already configured to work with Minio:

### Upload a passport image:

```typescript
import { storageService } from '@/lib/storage'

// Upload passport image
const key = storageService.generatePassportKey(userId, 'passport.jpg')
const buffer = await file.arrayBuffer()
const result = await storageService.uploadFile(
  key,
  Buffer.from(buffer),
  'image/jpeg',
  { userId, scanDate: new Date().toISOString() }
)

console.log('Uploaded to:', result.url)
```

### Get a file:

```typescript
const buffer = await storageService.getFile(key)
```

### Delete a file:

```typescript
await storageService.deleteFile(key)
```

### Get signed URL (for temporary access):

```typescript
const signedUrl = await storageService.getSignedUrl(key, 3600) // 1 hour
```

---

## Monitoring & Maintenance

### Check Storage Usage

1. Go to Minio Console
2. Click **"Monitoring"** in left sidebar
3. View storage metrics

### Backup Strategy

**Option 1: Minio to S3 Mirror**
```bash
# Setup mc (Minio Client)
mc alias set railway https://your-minio-url.up.railway.app MINIO_USER MINIO_PASSWORD

# Mirror to AWS S3
mc mirror railway/travel-check-uploads s3/backup-bucket
```

**Option 2: Periodic Snapshots**
- Create a cron job to backup bucket contents
- Store backups in Railway Volumes or external storage

### Security Best Practices

1. **Rotate Credentials:**
   - Periodically update `MINIO_ROOT_PASSWORD`
   - Update environment variables in Railway

2. **Enable Encryption:**
   - In Minio Console → Settings → Server Encryption
   - Enable SSE-S3 or SSE-KMS

3. **Monitor Access:**
   - Check Minio audit logs regularly
   - Set up alerts for unusual access patterns

---

## Troubleshooting

### Cannot access Minio Console

**Check:**
1. Minio service is running in Railway
2. Public domain is generated (Settings → Networking)
3. Firewall/browser not blocking the connection

**Solution:**
```bash
# Check Minio logs
railway logs --service minio --tail 100
```

### Files not uploading from application

**Check:**
1. Environment variables are set correctly
2. Bucket exists and has correct name
3. Bucket policy allows uploads

**Debug:**
```typescript
// Add logging to storage service
console.log('Minio config:', {
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET_NAME,
  region: process.env.S3_REGION,
})
```

### Images not accessible publicly

**Check:**
1. Bucket policy is set to allow public reads
2. `S3_PUBLIC_URL` is correct
3. Minio service has public domain

**Solution:**
Re-apply the bucket policy from Step 4.

---

## Cost Considerations

Railway Minio pricing:

- **Starter Plan**: Included in $5/month
- **Storage**: First 100GB included
- **Additional Storage**: $0.25/GB/month
- **Egress**: Bandwidth included in plan

**Estimated Costs:**
- Small app (< 10GB images): $0/month (included)
- Medium app (50GB images): ~$0/month (included)
- Large app (500GB images): ~$100/month

---

## Migration from Cloudflare R2 (if needed)

If you want to migrate from R2 to Minio later:

```bash
# Install aws-cli and configure both
aws configure --profile r2
aws configure --profile minio

# Sync from R2 to Minio
aws s3 sync s3://r2-bucket s3://travel-check-uploads \
  --source-region auto \
  --profile r2 \
  --endpoint-url https://your-r2-endpoint.com

aws s3 sync /tmp/sync-data s3://travel-check-uploads \
  --profile minio \
  --endpoint-url https://your-minio-url.up.railway.app
```

---

## Next Steps

✅ Minio is configured and ready!

Now proceed with:
1. Deploy your application
2. Test file uploads
3. Verify images are stored in Minio
4. Check public access to images

---

**Support:**
- Minio Docs: https://min.io/docs/minio/linux/index.html
- Railway Docs: https://docs.railway.app
- Project Issues: GitHub Issues
