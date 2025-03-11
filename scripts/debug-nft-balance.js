// Debug NFT balance script for Berachain
const { ethers } = require('ethers');
const config = require('../config/settings.json');

// Your wallet address
const walletToCheck = '0x2222222222222222222222222222222222222222';
const contractAddress = config.collection.contractAddress;

// Standard ERC721 and ERC1155 ABIs to try both
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

const ERC1155_ABI = [
  "function balanceOf(address owner, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] owners, uint256[] ids) view returns (uint256[])"
];

// Custom ABI with alternative ways to check balances
const CUSTOM_ABI = [
  // Basic ERC721
  "function balanceOf(address owner) view returns (uint256)",
  // Common utility functions 
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  // Custom NFT balance checks that might be implemented
  "function tokensOfOwner(address owner) view returns (uint256[])",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

async function debug() {
  try {
    // Get RPC URL from config
    const chain = config.collection.chain.toLowerCase();
    let rpcUrl;
    
    if (config.networks && config.networks[chain]) {
      rpcUrl = config.networks[chain].rpcUrl;
    } else {
      throw new Error(`No RPC URL found for chain: ${chain}`);
    }
    
    console.log(`\n----- DEBUGGING NFT VERIFICATION -----`);
    console.log(`Chain: ${chain}`);
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Wallet Address: ${walletToCheck}`);
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Test connection
    console.log(`\n----- TESTING BLOCKCHAIN CONNECTION -----`);
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Connected to blockchain! Current block: ${blockNumber}`);
      
      // Get chain info
      console.log(`\n----- CHAIN INFO -----`);
      const chainId = await provider.getNetwork();
      console.log(`Network Chain ID: ${chainId.chainId}`);
    } catch (error) {
      console.error(`❌ Failed to connect to blockchain: ${error.message}`);
      process.exit(1);
    }
    
    // Check if contract exists
    console.log(`\n----- CHECKING CONTRACT -----`);
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      console.error(`❌ No contract found at address: ${contractAddress}`);
    } else {
      console.log(`✅ Contract exists at ${contractAddress}!`);
      console.log(`Contract code length: ${code.length} bytes`);
    }
    
    // Try different ABI variants
    console.log(`\n----- TRYING STANDARD ERC721 ABI -----`);
    await tryContractABI(provider, contractAddress, ERC721_ABI, walletToCheck);
    
    console.log(`\n----- TRYING ERC1155 ABI -----`);
    await tryERC1155(provider, contractAddress, walletToCheck);
    
    console.log(`\n----- TRYING CUSTOM/EXTENDED ABI -----`);
    await tryContractABI(provider, contractAddress, CUSTOM_ABI, walletToCheck);
    
    console.log(`\n----- DEBUGGING COMPLETE -----`);
  } catch (error) {
    console.error(`FATAL ERROR: ${error.message}`);
    console.error(error);
  }
}

async function tryContractABI(provider, contractAddress, abi, walletAddress) {
  try {
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Try to get contract info
    try {
      const name = await contract.name().catch(() => 'Unknown');
      const symbol = await contract.symbol().catch(() => 'Unknown');
      console.log(`Contract info - Name: ${name}, Symbol: ${symbol}`);
      
      try {
        const totalSupply = await contract.totalSupply().catch(() => 'Unknown');
        console.log(`Total Supply: ${totalSupply}`);
      } catch (e) {
        console.log(`Could not get total supply: ${e.message}`);
      }
    } catch (error) {
      console.log(`Could not get basic contract info: ${error.message}`);
    }
    
    // Try to get balance
    try {
      console.log(`Checking balanceOf for ${walletAddress}...`);
      const balance = await contract.balanceOf(walletAddress);
      console.log(`✅ NFT Balance: ${balance.toString()}`);
    } catch (error) {
      console.error(`❌ Error calling balanceOf: ${error.message}`);
    }
    
    // Try tokens of owner if available
    try {
      console.log(`Trying tokensOfOwner if implemented...`);
      const tokens = await contract.tokensOfOwner(walletAddress);
      console.log(`✅ Tokens owned: ${tokens.toString()}`);
    } catch (error) {
      console.log(`Method tokensOfOwner not available: ${error.message}`);
    }
  } catch (error) {
    console.error(`Failed to interact with contract using this ABI: ${error.message}`);
  }
}

async function tryERC1155(provider, contractAddress, walletAddress) {
  try {
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
    
    // Try to check balance for token ID 1 (common first token)
    try {
      console.log(`Checking ERC1155 balanceOf for ${walletAddress}, token ID 1...`);
      const balance = await contract.balanceOf(walletAddress, 1);
      console.log(`✅ Token #1 Balance: ${balance.toString()}`);
    } catch (error) {
      console.error(`❌ Error calling ERC1155 balanceOf: ${error.message}`);
    }
    
    // Try batch balance check for multiple token IDs
    try {
      console.log(`Checking ERC1155 balanceOfBatch for first few token IDs...`);
      // Check first 5 token IDs
      const owners = Array(5).fill(walletAddress);
      const ids = [1, 2, 3, 4, 5];
      const balances = await contract.balanceOfBatch(owners, ids);
      console.log(`✅ Batch Token Balances: ${balances.toString()}`);
    } catch (error) {
      console.log(`Method balanceOfBatch not available: ${error.message}`);
    }
  } catch (error) {
    console.error(`Failed to interact as ERC1155: ${error.message}`);
  }
}

// Run the debug function
debug().catch(console.error);
