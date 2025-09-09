# App Check Debug Token Setup

This document explains how to configure and use the App Check debug token for development.

## What is App Check Debug Token?

Firebase App Check helps protect your backend resources from abuse by verifying that requests come from your authentic app. During development, you can use a debug token to bypass App Check validation.

## Debug Token

Your App Check debug token is: `8917507E-AC21-4A4B-B09A-054E88E423EA`

## Configuration

### 1. Frontend Configuration

The debug token is automatically configured in `frontend/src/lib/firebase.ts`:

```typescript
// Set App Check debug token for development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // @ts-ignore - App Check debug token is available in development
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = '8917507E-AC21-4A4B-B09A-054E88E423EA'
}
```

### 2. Environment Variables

Add to your `frontend/.env.local`:

```bash
NODE_ENV=development
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=8917507E-AC21-4A4B-B09A-054E88E423EA
```

### 3. Firebase Functions

Add to your `functions/.env`:

```bash
APPCHECK_DEBUG_TOKEN=8917507E-AC21-4A4B-B09A-054E88E423EA
ENFORCE_APP_CHECK=false
```

## Usage

### Development Mode

1. Make sure `NODE_ENV=development` in your environment
2. Start your development server
3. The debug token will be automatically used
4. Check browser console for App Check debug messages

### Verification

To verify the setup is working:

1. Open browser developer console
2. Look for App Check debug messages like:
   ```
   Firebase App Check debug token: 8917507E-AC21-4A4B-B09A-054E88E423EA
   ```
3. Firebase Functions should accept requests without App Check validation

## Security Notes

⚠️ **Important Security Considerations:**

- **Development Only**: This debug token should ONLY be used in development
- **Never in Production**: Never use debug tokens in production environments
- **Keep Secure**: Don't commit debug tokens to version control
- **Rotate Regularly**: Consider rotating debug tokens periodically

## Troubleshooting

### Common Issues

1. **Token Not Working**
   - Verify `NODE_ENV=development`
   - Check browser console for App Check messages
   - Ensure token is set before App Check initialization

2. **Functions Still Rejecting Requests**
   - Check `ENFORCE_APP_CHECK=false` in functions environment
   - Verify functions are using the debug token validation

3. **Console Errors**
   - Look for App Check initialization errors
   - Check if ReCaptcha site key is configured

### Debug Commands

```bash
# Check App Check configuration
firebase appcheck:debug-tokens:list --project=travelcheck-app

# Create a new debug token (if needed)
firebase appcheck:debug-tokens:create "NEW-TOKEN-HERE" --project=travelcheck-app
```

## Production Setup

For production, you'll need to:

1. Remove debug token configuration
2. Set up proper App Check providers (ReCaptcha, etc.)
3. Enable App Check enforcement in Firebase Functions
4. Configure production ReCaptcha site key

## References

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [App Check Debug Tokens](https://firebase.google.com/docs/app-check/web/debug-provider)
- [Firebase Functions App Check](https://firebase.google.com/docs/app-check/cloud-functions)

