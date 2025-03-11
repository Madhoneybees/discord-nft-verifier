const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('../database/firebase');
const nftVerification = require('../blockchain/nftVerification');
const roleManager = require('../roles/manager');

// Load settings from JSON file
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../config/settings.json'))
);

// Function to verify a single user
async function verifyUser(userId, userData) {
  try {
    console.log(`Verifying NFTs for user ${userId}`);
    
    // Skip users without wallet address
    if (!userData.wallet_address) {
      console.log(`Skipping user ${userId}: No wallet address`);
      return { userId, success: false, error: 'No wallet address' };
    }
    
    // Get current NFT count using our new implementation
    const currentNFTCount = await nftVerification.getNFTCount(userData.wallet_address);
    
    // If count changed or role needs update
    if (currentNFTCount !== userData.nft_count) {
      console.log(`Updating role for ${userId}: ${userData.nft_count || 0} → ${currentNFTCount} NFTs`);
      await roleManager.updateUserRole(userId, currentNFTCount);
    } else {
      console.log(`No change for user ${userId}: Still has ${currentNFTCount} NFTs`);
      
      // Update last_updated timestamp even if no changes
      await db.users.update(userId, {
        last_updated: new Date()
      });
    }
    
    return { userId, success: true, nftCount: currentNFTCount };
  } catch (error) {
    console.error(`Error verifying user ${userId}:`, error);
    return { userId, success: false, error: error.message };
  }
}

// Function to process all users in batches
async function verifyAllUsers() {
  console.log('Starting verification of all users');
  
  try {
    // Get all users from database
    const users = await db.users.getAll();
    console.log(`Found ${users.length} users to verify`);
    
    // Filter to only users with wallet addresses
    const usersWithWallets = users.filter(user => user.data && user.data.wallet_address);
    console.log(`${usersWithWallets.length} users have wallet addresses`);
    
    if (usersWithWallets.length === 0) {
      console.log('No users with wallet addresses to verify');
      return { total: users.length, processed: 0, successful: 0, failed: 0 };
    }
    
    // Get batch settings from config
    const batchOptions = {
      batchSize: settings.verification.batchSize || 10,
      batchDelay: settings.verification.batchDelay || 2000
    };
    
    // Extract wallet addresses for efficient batch processing
    const walletAddresses = usersWithWallets.map(user => user.data.wallet_address);
    console.log(`Processing ${walletAddresses.length} wallets in batches of ${batchOptions.batchSize}`);
    
    // Use our new batch processing function to get all NFT balances efficiently
    const nftResults = await nftVerification.batchVerifyWallets(walletAddresses, batchOptions);
    
    // Create a map of wallet address to balance for quick lookups
    const balanceMap = {};
    nftResults.forEach(result => {
      balanceMap[result.address.toLowerCase()] = result.balance;
    });
    
    // Update user roles based on NFT balances
    console.log('Updating user roles based on NFT balances...');
    const results = {
      total: users.length,
      processed: 0,
      successful: 0,
      failed: 0,
      unchanged: 0
    };
    
    for (const user of usersWithWallets) {
      try {
        const walletAddress = user.data.wallet_address.toLowerCase();
        const currentNFTCount = balanceMap[walletAddress] || 0;
        
        // If count changed or role needs update
        if (currentNFTCount !== user.data.nft_count) {
          console.log(`Updating role for ${user.id}: ${user.data.nft_count || 0} → ${currentNFTCount} NFTs`);
          await roleManager.updateUserRole(user.id, currentNFTCount);
          results.successful++;
        } else {
          console.log(`No change for user ${user.id}: Still has ${currentNFTCount} NFTs`);
          
          // Update last_updated timestamp even if no changes
          await db.users.update(user.id, {
            last_updated: new Date()
          });
          results.unchanged++;
        }
        
        results.processed++;
      } catch (error) {
        console.error(`Error updating role for user ${user.id}:`, error);
        results.failed++;
        results.processed++;
      }
    }
    
    console.log(`Completed verification of all users: 
      ${results.successful} updated, 
      ${results.unchanged} unchanged, 
      ${results.failed} failed`);
    
    return results;
  } catch (error) {
    console.error('Error during mass verification:', error);
    throw error;
  }
}

// Start the scheduled job
function startVerificationJob() {
  // Get schedule from settings
  const schedule = settings.verification.scheduleInterval || '0 */6 * * *';
  
  const job = cron.schedule(schedule, async () => {
    console.log(`Running scheduled verification job (schedule: ${schedule})`);
    try {
      await verifyAllUsers();
    } catch (error) {
      console.error('Error in scheduled verification job:', error);
    }
  });
  
  console.log(`Scheduled verification job started with schedule: ${schedule}`);
  return job;
}

// Function to trigger manual verification
async function triggerManualVerification() {
  console.log('Manual verification triggered');
  return await verifyAllUsers();
}

module.exports = {
  startVerificationJob,
  triggerManualVerification,
  verifyUser
};