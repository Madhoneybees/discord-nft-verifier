const fs = require('fs');
const path = require('path');

// Load settings from JSON file
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../config/settings.json'))
);

// Convert settings format to internal structure
const ROLES = {};
settings.roles.forEach(role => {
  ROLES[role.name] = {
    minNFTs: role.minNFTs,
    id: role.discordRoleId
  };
});

// Determine appropriate role based on NFT count
function determineRole(nftCount) {
  // Sort roles by minNFTs in descending order to check highest tier first
  const sortedRoles = settings.roles.sort((a, b) => b.minNFTs - a.minNFTs);
  
  for (const role of sortedRoles) {
    if (nftCount >= role.minNFTs) {
      return {
        name: role.name,
        id: role.discordRoleId
      };
    }
  }
  
  return { name: null, id: null };
}

module.exports = { determineRole, ROLES };