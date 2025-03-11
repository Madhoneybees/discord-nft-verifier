/**
 * Ultra Lightweight NFT Verification Dashboard
 * 
 * A simple, single-page dashboard to monitor your NFT verification system.
 * Designed to be lightweight and Cloudflare-compatible.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const db = require('../database/firebase');
const verification = require('../jobs/verification');
const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

// Firebase initialization
try {
  initializeApp();
} catch (error) {
  console.log('Firebase already initialized');
}

// Basic auth password (from environment variable)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Simple basic auth middleware
const basicAuth = (req, res, next) => {
  // Get auth header
  const auth = req.headers.authorization;
  
  // Check if auth header exists
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required');
  }
  
  // Parse auth header
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  const password = credentials[1];
  
  // Check password
  if (password === ADMIN_PASSWORD) {
    return next();
  }
  
  // Auth failed
  res.setHeader('WWW-Authenticate', 'Basic');
  return res.status(401).send('Authentication failed');
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Endpoints

// Dashboard stats
app.get('/api/stats', basicAuth, async (req, res) => {
  try {
    // Get users stats
    const users = await db.users.getAll();
    const totalUsers = users.length;
    
    // Count verified users
    const verifiedUsers = users.filter(user => 
      user.data && user.data.verified
    ).length;
    
    // Count by NFT ownership
    const nftDistribution = {};
    users.forEach(user => {
      if (user.data && user.data.nft_count !== undefined) {
        const count = user.data.nft_count;
        nftDistribution[count] = (nftDistribution[count] || 0) + 1;
      }
    });
    
    // Get five most recent verifications
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
        date: new Date(user.data.verification_date instanceof Date ? 
          user.data.verification_date : 
          user.data.verification_date.toDate()).toISOString(),
        nft_count: user.data.nft_count || 0
      }));
    
    res.json({
      total_users: totalUsers,
      verified_users: verifiedUsers,
      nft_distribution: nftDistribution,
      recent_verifications: recentVerifications
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

// Trigger verification job manually
app.post('/api/trigger-verification', basicAuth, async (req, res) => {
  try {
    const results = await verification.triggerManualVerification();
    res.json({
      success: true,
      processed: results.processed,
      updated: results.successful,
      unchanged: results.unchanged,
      failed: results.failed
    });
  } catch (error) {
    console.error('Error triggering verification:', error);
    res.status(500).json({ error: 'Failed to trigger verification job' });
  }
});

// Serve the dashboard (static HTML)
app.get('/', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`NFT Verification Dashboard running at http://localhost:${PORT}`);
});
