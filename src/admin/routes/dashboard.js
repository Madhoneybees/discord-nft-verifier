/**
 * Dashboard routes for NFT Verification Admin
 */

const express = require('express');
const router = express.Router();
const db = require('../../database/firebase');
const verification = require('../../jobs/verification');

// Dashboard home - system stats
router.get('/', async (req, res) => {
  try {
    // Get users stats
    const users = await db.users.getAll();
    const totalUsers = users.length;
    
    // Count verified users
    const verifiedUsers = users.filter(user => 
      user.data && user.data.verified
    ).length;
    
    // Count users by NFT ownership
    const nftDistribution = {};
    users.forEach(user => {
      if (user.data && user.data.nft_count !== undefined) {
        const count = user.data.nft_count;
        nftDistribution[count] = (nftDistribution[count] || 0) + 1;
      }
    });
    
    // Count pending verifications
    const pendingVerifications = await db.pendingVerifications.getAll();
    
    // Format dates for the last few verifications
    const recentVerifications = users
      .filter(user => user.data && user.data.verification_date)
      .sort((a, b) => {
        const dateA = a.data.verification_date instanceof Date ? 
          a.data.verification_date : 
          a.data.verification_date.toDate();
        const dateB = b.data.verification_date instanceof Date ? 
          b.data.verification_date : 
          b.data.verification_date.toDate();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(user => ({
        id: user.id,
        wallet: user.data.wallet_address,
        date: user.data.verification_date instanceof Date ? 
          user.data.verification_date.toLocaleString() : 
          user.data.verification_date.toDate().toLocaleString(),
        nft_count: user.data.nft_count || 0
      }));
    
    res.render('dashboard', { 
      totalUsers,
      verifiedUsers,
      nftDistribution,
      pendingVerifications: pendingVerifications.length,
      recentVerifications,
      page: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', { 
      error: 'Error loading dashboard data',
      page: 'dashboard'
    });
  }
});

// Trigger verification job
router.post('/trigger-verification', async (req, res) => {
  try {
    const results = await verification.triggerManualVerification();
    res.json({ 
      success: true, 
      message: `Verification completed: ${results.successful} updated, ${results.unchanged} unchanged, ${results.failed} failed` 
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error triggering verification job' 
    });
  }
});

module.exports = router;
