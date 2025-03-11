const path = require('path');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/settings.json')));
const db = require('../database/firebase');

// Import main client instead of creating a new one
let mainClient = null;

// Get main client reference
function getClient() {
  if (!mainClient) {
    try {
      // Get the client from the main bot instance
      const { client } = require('../discord/client');
      mainClient = client;
      console.log('Role manager using main Discord client');
    } catch (error) {
      console.error('Error getting main client:', error);
    }
  }
  
  return mainClient;
}

// Sort roles by minNFTs in descending order (highest tier first)
const roles = config.roles || [];
const sortedRoles = roles.sort((a, b) => b.minNFTs - a.minNFTs);

/**
 * Update a user's roles based on their NFT count
 * @param {string} userId - Discord user ID
 * @param {number} nftCount - Number of NFTs the user owns
 * @returns {Object} The assigned role
 */
async function updateUserRole(userId, nftCount) {
  try {
    // Get the client instance
    const client = getClient();
    
    // Make sure we have a valid client
    if (!client) {
      console.error('Could not get Discord client!');
      return { name: 'Error', description: 'Discord client unavailable. Please contact an administrator.' };
    }
    
    // Wait for client to be ready before proceeding
    if (!client.isReady()) {
      // Wait up to 5 seconds for client to be ready
      for (let i = 0; i < 10; i++) {
        if (client.isReady()) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!client.isReady()) {
        console.error('Client not ready after timeout');
        return { name: 'Error', description: 'Bot is not properly connected to Discord. Please try again later.' };
      }
    }
    
    // Find all guilds the bot is in
    const guilds = Array.from(client.guilds.cache.values());
    
    // Track which role the user qualifies for
    let assignedRole = null;
    
    if (guilds.length === 0) {
      console.error('Bot is not in any guilds!');
      return { name: 'Error', description: 'Bot is not connected to any Discord servers.' };
    }
    
    // Process each guild
    for (const guild of guilds) {
      try {
        // Get the member in this guild
        let member;
        try {
          member = await guild.members.fetch(userId);
        } catch (fetchError) {
          console.error(`Could not fetch member ${userId} in guild ${guild.name}:`, fetchError.message);
          continue;
        }
        
        if (!member) {
          continue;
        }
        
        // Check bot permissions
        const botMember = guild.members.me;
        if (!botMember) {
          console.error(`Bot is not a member of guild ${guild.name}!`);
          continue;
        }
        
        if (!botMember.permissions.has('ManageRoles')) {
          console.error(`Bot does not have ManageRoles permission in guild ${guild.name}!`);
          continue;
        }
        
        // Find which role the user qualifies for
        // The roles are sorted by minNFTs in descending order
        const qualifyingRole = sortedRoles.find(role => nftCount >= role.minNFTs);
        
        // Get all role IDs from the config
        const allRoleIds = sortedRoles.map(role => role.discordRoleId);
        
        // Determine which role the user should have and which ones to remove
        const targetRoleId = qualifyingRole ? qualifyingRole.discordRoleId : null;
        const rolesToRemove = allRoleIds.filter(roleId => roleId !== targetRoleId);
        
        // Get current NFT roles the user has
        const currentNftRoles = member.roles.cache.filter(role => allRoleIds.includes(role.id));
        const currentNftRoleIds = currentNftRoles.map(role => role.id);
        
        // Check if user already has exactly the correct role and no other NFT roles
        const hasCorrectRoleSetup = 
          (targetRoleId === null && currentNftRoleIds.length === 0) || 
          (currentNftRoleIds.length === 1 && currentNftRoleIds[0] === targetRoleId);
        
        if (hasCorrectRoleSetup) {
          // User already has the correct role setup, no changes needed
          assignedRole = qualifyingRole;
          continue;
        }
        
        // Remove roles that the user shouldn't have
        for (const roleId of rolesToRemove) {
          // Check if the role exists in the server and user has it
          const role = guild.roles.cache.get(roleId);
          if (!role || !member.roles.cache.has(roleId)) {
            continue;
          }
          
          // Check if bot can manage this role (role hierarchy)
          if (botMember.roles.highest.comparePositionTo(role) <= 0) {
            console.error(`Bot cannot manage role ${role.name} due to role hierarchy!`);
            continue;
          }
          
          try {
            await member.roles.remove(roleId);
          } catch (removeError) {
            console.error(`Error removing role ${role.name} from user ${member.user.tag}:`, removeError.message);
          }
        }
        
        // Assign the appropriate role if the user qualifies and doesn't already have it
        if (qualifyingRole && !member.roles.cache.has(targetRoleId)) {
          assignedRole = qualifyingRole;
          const role = guild.roles.cache.get(targetRoleId);
          if (!role) {
            console.error(`Role ${targetRoleId} not found in guild ${guild.name}`);
            continue;
          }
          
          // Check if bot can manage this role (role hierarchy)
          if (botMember.roles.highest.comparePositionTo(role) <= 0) {
            console.error(`Bot cannot manage role ${role.name} due to role hierarchy!`);
            continue;
          }
          
          try {
            await member.roles.add(role);
          } catch (addError) {
            console.error(`Error adding role ${role.name} to user ${member.user.tag}:`, addError.message);
          }
        }
      } catch (error) {
        console.error(`Error updating roles for user ${userId} in guild ${guild.name}:`, error);
      }
    }
    
    // Store the user's role in the database
    if (assignedRole) {
      await db.users.updateRole(userId, {
        roleId: assignedRole.discordRoleId,
        roleName: assignedRole.name,
        roleDescription: assignedRole.description || null,
        nftCount: nftCount,
        lastUpdated: new Date()
      });
    }
    
    return assignedRole || { name: null, discordRoleId: null, description: null };
  } catch (error) {
    console.error(`Error in updateUserRole for user ${userId}:`, error);
    return { name: null, discordRoleId: null };
  }
}

module.exports = {
  updateUserRole,
  getClient
};