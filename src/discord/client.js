const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Initialize Discord client with all required intents and partials
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
  // Make sure to fetch all members for role assignment
  fetchAllMembers: true
});

// Log when bot joins a new server
client.on('guildCreate', (guild) => {
  console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);
  console.log(`This guild has ${guild.memberCount} members`);
  
  // List available roles for debugging
  console.log('Available roles in this guild:');
  guild.roles.cache.forEach(role => {
    console.log(`- ${role.name} (${role.id})`);
  });
});

// Add error handling to prevent crashes
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

// Add debugging for role updates
client.on('guildMemberUpdate', (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
  
  if (addedRoles.size > 0 || removedRoles.size > 0) {
    console.log(`Member ${newMember.user.tag} (${newMember.id}) roles updated:`);
    if (addedRoles.size > 0) {
      console.log('Added roles:', [...addedRoles.values()].map(r => r.name).join(', '));
    }
    if (removedRoles.size > 0) {
      console.log('Removed roles:', [...removedRoles.values()].map(r => r.name).join(', '));
    }
  }
});

module.exports = { client };