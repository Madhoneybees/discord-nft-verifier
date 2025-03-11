const { ethers } = require('ethers');
const crypto = require('crypto');
const db = require('../database/firebase');

// Store pending verification attempts
const pendingVerifications = new Map();

// Simple rate limiting for verification attempts
const verificationAttempts = new Map();
const MAX_ATTEMPTS = 5; // Maximum attempts per 15 min window
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Generate a verification message for a user
function generateVerificationMessage(user, guild, walletAddress) {
  // Validate wallet address format
  if (!ethers.isAddress(walletAddress)) {
    throw new Error('Invalid wallet address format');
  }

  // Rate limiting check
  const userId = user.id;
  const now = Date.now();
  
  // Get user's verification attempts
  let attempts = verificationAttempts.get(userId) || [];
  
  // Remove attempts older than the window
  attempts = attempts.filter(time => time > now - ATTEMPT_WINDOW);
  
  // Check if user has exceeded maximum attempts
  if (attempts.length >= MAX_ATTEMPTS) {
    throw new Error(`Too many verification attempts. Please try again later.`);
  }
  
  // Add current attempt
  attempts.push(now);
  verificationAttempts.set(userId, attempts);

  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = now;
  
  const message = 
    `Verify Discord account: ${user.tag} (${user.id})\n` +
    `Wallet: ${walletAddress}\n` + 
    `Server: ${guild.name}\n` + 
    `Nonce: ${nonce}\n` + 
    `Timestamp: ${timestamp}`;
  
  // Store the verification request in memory
  pendingVerifications.set(user.id, {
    walletAddress,
    message,
    nonce,
    timestamp,
    expires: timestamp + 10 * 60 * 1000 // 10 minutes expiration
  });
  
  // Also store in database for persistence across restarts
  db.pendingVerifications.set(user.id, {
    walletAddress,
    message,
    nonce,
    timestamp,
    expires: timestamp + 10 * 60 * 1000
  });
  
  return message;
}

// Verify a signature
async function verifySignature(userId, signature) {
  // Get pending verification from memory or database
  let verification = pendingVerifications.get(userId);
  
  if (!verification) {
    // Try to get from database if not in memory
    verification = await db.pendingVerifications.get(userId);
  }
  
  // Check if verification exists
  if (!verification) {
    return { 
      success: false, 
      error: 'No pending verification found. Please start the verification process again.' 
    };
  }
  
  // Check if verification has expired
  if (Date.now() > verification.expires) {
    // Clean up expired verification
    pendingVerifications.delete(userId);
    await db.pendingVerifications.delete(userId);
    
    return { 
      success: false, 
      error: 'Verification request expired. Please start the process again.' 
    };
  }
  
  try {
    // Verify the signature
    const signerAddress = ethers.verifyMessage(verification.message, signature);
    
    // Check if the recovered address matches the claimed address
    if (signerAddress.toLowerCase() !== verification.walletAddress.toLowerCase()) {
      return { 
        success: false, 
        error: 'Signature verification failed. The signature does not match the provided wallet address.' 
      };
    }
    
    // Verification successful!
    
    // Clean up the pending verification
    pendingVerifications.delete(userId);
    await db.pendingVerifications.delete(userId);
    
    // Update the user's verified wallet in the database
    await db.users.set(userId, {
      wallet_address: verification.walletAddress,
      verified: true,
      verification_date: new Date(),
      verification_method: 'signature'
    });
    
    return { 
      success: true, 
      walletAddress: verification.walletAddress 
    };
  } catch (error) {
    console.error('Error verifying signature:', error);
    return { 
      success: false, 
      error: 'Invalid signature format. Please make sure you copied the entire signature correctly.' 
    };
  }
}

// Get a user's pending verification
async function getPendingVerification(userId) {
  const verification = pendingVerifications.get(userId) || await db.pendingVerifications.get(userId);
  return verification;
}

module.exports = {
  generateVerificationMessage,
  verifySignature,
  getPendingVerification
};