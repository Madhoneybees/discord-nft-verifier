const web3 = require('../wallet/web3');

/**
 * Get NFT count for a wallet address
 * This is the function called by the verification job
 * 
 * @param {string} walletAddress - The wallet address to check
 * @param {string} contractAddress - NFT contract address (from config)
 * @param {string} chain - Blockchain network (from config)
 * @returns {Promise<number>} Number of NFTs owned
 */
async function getNFTCount(walletAddress, contractAddress, chain) {
  try {
    console.log(`Checking NFT balance for ${walletAddress} (Berachain Mainnet)`);
    // Our web3.js implementation already uses the contract address from config
    const nftCount = await web3.getNFTBalance(walletAddress);
    console.log(`Found ${nftCount} NFTs for wallet ${walletAddress}`);
    return nftCount;
  } catch (error) {
    console.error(`Error getting NFT count for ${walletAddress}:`, error);
    // Add blockchain error information to make debugging easier
    const errorMessage = error.message || 'Unknown error';
    throw new Error(`NFT verification error: ${errorMessage}`);
  }
}

/**
 * Batch process multiple wallets
 * This can be used for more efficient processing
 * 
 * @param {string[]} walletAddresses - Array of wallet addresses to check
 * @param {object} options - Optional batch processing options
 * @returns {Promise<Array>} Results with address and balance
 */
async function batchVerifyWallets(walletAddresses, options = {}) {
  return await web3.batchProcess(walletAddresses, options);
}

module.exports = {
  getNFTCount,
  batchVerifyWallets
};
