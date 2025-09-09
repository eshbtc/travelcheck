#!/usr/bin/env node
/*
 Promote a user to admin by email.
 Usage:
   node functions/scripts/promote-admin.js --email user@example.com [--serviceAccount path/to/service-account-key.json]

 Requirements:
   - Service account key with editor/admin rights to your Firebase project, or
   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a valid service account json
*/

const path = require('path')
const fs = require('fs')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--email') {
      out.email = args[++i]
    } else if (a === '--serviceAccount') {
      out.serviceAccount = args[++i]
    }
  }
  return out
}

async function main() {
  const { email, serviceAccount } = parseArgs()
  if (!email) {
    console.error('Error: --email is required')
    process.exit(1)
  }

  let credentialOpts = {}
  if (serviceAccount) {
    const saPath = path.resolve(process.cwd(), serviceAccount)
    if (!fs.existsSync(saPath)) {
      console.error(`Service account file not found: ${saPath}`)
      process.exit(1)
    }
    credentialOpts.credential = require('firebase-admin').credential.cert(require(saPath))
  }

  const admin = require('firebase-admin')
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp(credentialOpts)
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e)
    process.exit(1)
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email)
    const uid = userRecord.uid
    console.log(`Found user ${email} (uid: ${uid}). Setting role=admin ...`)

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' })

    // Update Firestore profile
    await admin.firestore().collection('users').doc(uid).set({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    console.log('Success: user promoted to admin.')
    console.log('Note: The user must sign out/in to refresh token claims.')
    process.exit(0)
  } catch (e) {
    console.error('Failed to promote user:', e)
    process.exit(1)
  }
}

main()

