const { ethers } = require('ethers');
const config = require('../../config/settings.json');

// More comprehensive ERC721 ABI with multiple ways to check balances
const NFT_ABI = [
  // Standard ERC721 balanceOf
  "function balanceOf(address owner) view returns (uint256)",
  // Optional: Additional functions that might help with debugging
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

// Get the contract address from config
const contractAddress = config.collection.contractAddress;
console.log(`Using NFT contract address: ${contractAddress}`);


// Create a provider based on the chain from config
function getProvider() {
  const chain = config.collection.chain.toLowerCase();
  let rpcUrl;
  
  // Use the networks configuration if available
  if (config.networks && config.networks[chain]) {
    rpcUrl = config.networks[chain].rpcUrl;
  } else {
    // Fallback to default RPC URLs if networks config is not available
    const defaultRpcUrls = {
      'berachain': 'https://rpc.berachain.com' // Updated to Berachain mainnet
    };
    rpcUrl = defaultRpcUrls[chain];
  }
  
  if (!rpcUrl) {
    throw new Error(`No RPC URL found for chain: ${chain}`);
  }
  
  console.log(`Using RPC URL for ${chain}: ${rpcUrl}`);
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Get NFT balance for a wallet address
async function getNFTBalance(walletAddress) {
  try {
    console.log(`Attempting to get NFT balance for wallet: ${walletAddress}`);
    const provider = getProvider();
    
    // First, check if we can even connect to the network
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log(`Successfully connected to blockchain. Current block: ${blockNumber}`);
    } catch (networkError) {
      console.error(`Failed to connect to blockchain:`, networkError);
      throw new Error(`Network connection failed: ${networkError.message}`);
    }
    
    // Create contract instance
    console.log(`Creating contract instance for: ${contractAddress}`);
    const contract = new ethers.Contract(contractAddress, NFT_ABI, provider);
    
    // Try to get basic contract info first for debugging
    try {
      // These are optional and might fail if the contract doesn't implement them
      const name = await contract.name().catch(() => 'Unknown');
      const symbol = await contract.symbol().catch(() => 'Unknown');
      console.log(`Contract info - Name: ${name}, Symbol: ${symbol}`);
    } catch (infoError) {
      console.log(`Could not get contract info (this is often normal): ${infoError.message}`);
    }
    
    // Now attempt to get the balance
    console.log(`Calling balanceOf for address: ${walletAddress}`);
    const balanceResult = await contract.balanceOf(walletAddress);
    console.log(`Raw balance result:`, balanceResult);
    
    const balance = Number(balanceResult);
    console.log(`Converted balance for ${walletAddress}: ${balance}`);
    return balance;
  } catch (error) {
    console.error(`Error getting NFT balance for ${walletAddress}:`, error);
    console.error(`Stack trace:`, error.stack);
    
    // Add more specific error handling
    if (error.message.includes('network') || error.message.includes('connection')) {
      throw new Error(`Blockchain connection failed. Please try again later. Details: ${error.message}`);
    } else if (error.message.includes('contract')) {
      throw new Error(`Contract interaction failed. Please check contract address. Details: ${error.message}`);
    } else {
      throw new Error(`Failed to check NFT balance: ${error.message}`);
    }
  }
}

/**
 * Process wallet balances in batches to avoid rate limiting
 * Uses the settings from config or provided options
 */
async function batchProcess(walletAddresses, options = {}) {
  // Use config values or defaults if not provided
  const batchSize = options.batchSize || 
                   (config.verification && config.verification.batchSize) || 10;
  
  const batchDelay = options.batchDelay || 
                    (config.verification && config.verification.batchDelay) || 1000;
  
  const results = [];
  console.log(`Processing ${walletAddresses.length} wallets in batches of ${batchSize}`);

  // Helper function for delays
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // Process in batches
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize);
    
    // Process this batch of wallets
    for (const address of batch) {
      try {
        const balance = await getNFTBalance(address);
        results.push({ address, balance });
      } catch (error) {
        console.error(`Failed to get balance for ${address}:`, error);
        results.push({ address, balance: 0, error: true });
      }
    }
    
    // Delay between batches (but not after the last batch)
    if (i + batchSize < walletAddresses.length) {
      await delay(batchDelay);
    }
  }
  
  return results;
}

module.exports = {
  getNFTBalance,
  batchProcess
};