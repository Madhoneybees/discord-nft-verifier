#!/usr/bin/env node
/**
 * Firebase Utilities for Discord NFT Verification
 * 
 * This script provides helpful utilities for managing your Firebase database:
 * - View database statistics
 * - Export user data
 * - Clear expired verifications
 * - Test database connections
 * - Reset specific users
 * 
 * Usage:
 *   node firebase-utils.js [command]
 * 
 * Commands:
 *   stats - View database statistics
 *   export - Export user data to a JSON file
 *   clean - Clean up expired verifications
 *   test - Test database connection and queries
 *   reset-user [discord_id] - Reset a specific user's verification
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Log with colors
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Helper function to ask questions
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Initialize Firebase
function initFirebase() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsPath) {
    log('❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env file', colors.red);
    process.exit(1);
  }
  
  const resolvedCredentialsPath = path.resolve(process.cwd(), credentialsPath);
  
  if (!fs.existsSync(resolvedCredentialsPath)) {
    log(`❌ Firebase credentials file not found at: ${resolvedCredentialsPath}`, colors.red);
    process.exit(1);
  }
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(resolvedCredentialsPath)
    });
    return true;
  } catch (error) {
    log('❌ Failed to initialize Firebase:', colors.red);
    log(error.message, colors.red);
    return false;
  }
}

// Get stats about the database
async function getStats() {
  log('\n📊 Database Statistics', colors.bright + colors.cyan);
  
  const db = admin.firestore();
  
  try {
    // Count users
    const usersSnapshot = await db.collection('users').get();
    log(`Users: ${usersSnapshot.size}`, colors.yellow);
    
    // Count verified users
    let verifiedCount = 0;
    usersSnapshot.forEach(doc => {
      if (doc.data().verified) verifiedCount++;
    });
    log(`Verified users: ${verifiedCount}`, colors.green);
    
    // Count pending verifications
    const pendingVerificationsSnapshot = await db.collection('pending_verifications').get();
    log(`Pending verifications: ${pendingVerificationsSnapshot.size}`, colors.yellow);
    
    // Get expired verifications
    const now = Date.now();
    let expiredCount = 0;
    pendingVerificationsSnapshot.forEach(doc => {
      if (doc.data().expires < now) expiredCount++;
    });
    log(`Expired verifications: ${expiredCount}`, colors.red);
    
    // NFT distribution
    log('\nNFT Distribution:', colors.magenta);
    const nftCounts = {};
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const count = data.nft_count || 0;
      nftCounts[count] = (nftCounts[count] || 0) + 1;
    });
    
    Object.keys(nftCounts).sort((a, b) => Number(a) - Number(b)).forEach(count => {
      log(`  ${count} NFTs: ${nftCounts[count]} users`, colors.cyan);
    });
    
  } catch (error) {
    log('❌ Error getting stats:', colors.red);
    log(error.message, colors.red);
  }
}

// Export user data to a JSON file
async function exportData() {
  log('\n📤 Exporting User Data', colors.bright + colors.cyan);
  
  const db = admin.firestore();
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    const userData = [];
    usersSnapshot.forEach(doc => {
      userData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `users-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);
    
    // Write data to file
    fs.writeFileSync(filepath, JSON.stringify(userData, null, 2));
    
    log(`✅ Exported ${userData.length} users to ${filepath}`, colors.green);
  } catch (error) {
    log('❌ Error exporting data:', colors.red);
    log(error.message, colors.red);
  }
}

// Clean up expired verifications
async function cleanExpired() {
  log('\n🧹 Cleaning Expired Verifications', colors.bright + colors.cyan);
  
  const db = admin.firestore();
  
  try {
    const now = Date.now();
    const batch = db.batch();
    let count = 0;
    
    const pendingVerificationsSnapshot = await db.collection('pending_verifications').get();
    
    pendingVerificationsSnapshot.forEach(doc => {
      if (doc.data().expires < now) {
        batch.delete(doc.ref);
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      log(`✅ Deleted ${count} expired verification(s)`, colors.green);
    } else {
      log('✅ No expired verifications to clean up', colors.green);
    }
  } catch (error) {
    log('❌ Error cleaning expired verifications:', colors.red);
    log(error.message, colors.red);
  }
}

// Test database connection
async function testDatabase() {
  log('\n🧪 Testing Database Connection', colors.bright + colors.cyan);
  
  const db = admin.firestore();
  
  try {
    // Test write
    log('Testing write operation...', colors.yellow);
    await db.collection('test').doc('connection_test').set({
      timestamp: admin.firestore.Timestamp.now(),
      message: 'Database connection test'
    });
    log('✅ Write operation successful', colors.green);
    
    // Test read
    log('Testing read operation...', colors.yellow);
    const docRef = await db.collection('test').doc('connection_test').get();
    if (docRef.exists) {
      log('✅ Read operation successful', colors.green);
    } else {
      log('❌ Read operation failed', colors.red);
    }
    
    // Clean up test document
    log('Cleaning up test document...', colors.yellow);
    await db.collection('test').doc('connection_test').delete();
    log('✅ Cleanup successful', colors.green);
    
    log('\n✅ All database operations completed successfully!', colors.bright + colors.green);
  } catch (error) {
    log('❌ Database test failed:', colors.red);
    log(error.message, colors.red);
  }
}

// Reset a specific user's verification
async function resetUser(discordId) {
  if (!discordId) {
    discordId = await question('Enter Discord user ID to reset: ');
  }
  
  log(`\n🔄 Resetting user: ${discordId}`, colors.bright + colors.cyan);
  
  const db = admin.firestore();
  
  try {
    // Check if user exists
    const userDoc = await db.collection('users').doc(discordId).get();
    
    if (!userDoc.exists) {
      log('❌ User not found in database', colors.red);
      return;
    }
    
    // Show current user data
    log('Current user data:', colors.yellow);
    log(JSON.stringify(userDoc.data(), null, 2), colors.yellow);
    
    // Confirm reset
    const confirm = await question('Are you sure you want to reset this user? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      log('Operation cancelled', colors.yellow);
      return;
    }
    
    // Reset user
    await db.collection('users').doc(discordId).update({
      verified: false,
      wallet_address: null,
      nft_count: 0,
      last_updated: admin.firestore.Timestamp.now()
    });
    
    // Delete any pending verifications
    await db.collection('pending_verifications').doc(discordId).delete();
    
    log('✅ User reset successfully', colors.green);
  } catch (error) {
    log('❌ Error resetting user:', colors.red);
    log(error.message, colors.red);
  }
}

// Show help
function showHelp() {
  log('\n🔥 Firebase Utilities for Discord NFT Verification', colors.bright + colors.cyan);
  log('\nUsage:', colors.bright);
  log('  node firebase-utils.js [command]');
  
  log('\nCommands:', colors.bright);
  log('  stats        - View database statistics');
  log('  export       - Export user data to a JSON file');
  log('  clean        - Clean up expired verifications');
  log('  test         - Test database connection and queries');
  log('  reset-user   - Reset a specific user\'s verification');
  log('  help         - Show this help message');
  
  log('\nExamples:', colors.bright);
  log('  node firebase-utils.js stats');
  log('  node firebase-utils.js reset-user 123456789012345678');
}

// Main execution function
async function main() {
  // Initialize Firebase
  if (!initFirebase()) {
    process.exit(1);
  }
  
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    showHelp();
  } else if (command === 'stats') {
    await getStats();
  } else if (command === 'export') {
    await exportData();
  } else if (command === 'clean') {
    await cleanExpired();
  } else if (command === 'test') {
    await testDatabase();
  } else if (command === 'reset-user') {
    const userId = process.argv[3];
    await resetUser(userId);
  } else {
    log(`❌ Unknown command: ${command}`, colors.red);
    showHelp();
  }
  
  rl.close();
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  process.exit(1);
});
