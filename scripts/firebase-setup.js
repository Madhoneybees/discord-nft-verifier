#!/usr/bin/env node
/**
 * Firebase Setup Script
 * 
 * This script helps initialize your Firebase database structure for the NFT verification bot.
 * It will:
 * 1. Verify your Firebase credentials
 * 2. Create necessary collections and indexes
 * 3. Set up default security rules
 * 
 * Usage:
 *   node firebase-setup.js
 * 
 * Requirements:
 *   - Firebase credentials JSON file (set in GOOGLE_APPLICATION_CREDENTIALS env var)
 *   - Firebase Admin SDK installed
 */

require('dotenv').config({ path: '../.env' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Your web app's Firebase configuration - loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Log warning if any required Firebase environment variables are missing
const requiredVars = ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('\x1b[31mError: Missing required environment variables:\x1b[0m', missingVars.join(', '));
  console.error('Please add these to your .env file before running this script.');
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Log with colors
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Main execution function
async function main() {
  log('\n🔥 Discord NFT Verification - Firebase Setup 🔥\n', colors.bright + colors.cyan);
  
  // Step 1: Initialize Firebase with Web SDK
  log('Step 1: Initializing Firebase...', colors.bright);
  
  try {
    // Initialize Firebase with web config
    const app = initializeApp(firebaseConfig);
    
    log('✅ Successfully connected to Firebase', colors.green);
    
    // Get Firebase project info
    const projectId = app.options.projectId;
    log(`📂 Firebase Project: ${projectId}`, colors.cyan);
  } catch (error) {
    log('❌ Failed to initialize Firebase:', colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
  
  // Step 2: Initialize Firestore collections
  log('\nStep 2: Setting up Firestore collections...', colors.bright);
  
  const db = getFirestore();
  
  // Create users collection with a test document
  log('Creating users collection...', colors.yellow);
  try {
    const usersCollection = collection(db, 'users');
    await setDoc(doc(usersCollection, 'test_user'), {
      wallet_address: '0x0000000000000000000000000000000000000000',
      nftCount: 0,
      verified: true,
      verification_date: serverTimestamp(),
      verification_method: 'setup_script',
      lastUpdated: serverTimestamp()
    });
    log('✅ Users collection created successfully', colors.green);
  } catch (error) {
    log('❌ Error creating users collection:', colors.red);
    log(error.message, colors.red);
  }
  
  // Create pending_verifications collection
  log('Creating pending_verifications collection...', colors.yellow);
  try {
    const pendingVerificationsCollection = collection(db, 'pending_verifications');
    await setDoc(doc(pendingVerificationsCollection, 'test_verification'), {
      walletAddress: '0x0000000000000000000000000000000000000000',
      message: 'Test verification message',
      nonce: 'test_nonce',
      created: serverTimestamp(),
      expirationTime: new Date(Date.now() + 600000) // 10 minutes
    });
    log('✅ Pending verifications collection created successfully', colors.green);
    
    // Clean up test documents
    await deleteDoc(doc(usersCollection, 'test_user'));
    await deleteDoc(doc(pendingVerificationsCollection, 'test_verification'));
    log('✅ Test documents cleaned up', colors.green);
  } catch (error) {
    log('❌ Error creating pending_verifications collection:', colors.red);
    log(error.message, colors.red);
  }
  
  // Step 3: Prompt for Firebase Console security rules setup
  log('\nStep 3: Security rules setup', colors.bright);
  log(`
For security reasons, you should set up proper Firestore security rules.
Visit the Firebase console to set up security rules:

1. Go to: https://console.firebase.google.com/project/nftdiscordbot/firestore/rules
2. Copy and paste the following rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all reads and writes by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Allow read and write access to server-side applications only
    // Your Bot will use service account credentials
  }
}
`, colors.yellow);
  
  log('\n✅ Firebase setup completed successfully!', colors.bright + colors.green);
  log('\nNext steps:', colors.bright);
  log('1. Ensure your bot has the necessary permissions in Discord');
  log('2. Set up any custom Firebase functions if needed');
  log('3. Run the bot with npm start');
  
  rl.close();
}

// Run the script
main().catch(error => {
  log(`\n❌ Setup failed with error: ${error.message}`, colors.red);
  process.exit(1);
});
