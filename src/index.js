require('dotenv').config();
const { client } = require('./discord/client');
const { initializeApp } = require('firebase/app');
const commandHandler = require('./discord/command');
const backgroundJobs = require('./jobs/verification');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
initializeApp(firebaseConfig);

// Set up event handlers
client.once('ready', async () => {
  console.log(`Bot is ready as ${client.user.tag}`);
  
  // Print bot invite URL for convenience
  console.log(`Invite URL: https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=268435456&scope=bot%20applications.commands`);
  
  // Start background verification job
  backgroundJobs.startVerificationJob();
  
  // Make sure to check and update application command permissions
  try {
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (guild) {
      console.log(`Connected to guild: ${guild.name}`);
      console.log(`Bot has ${guild.members.cache.size} cached members`);
      console.log('Ensuring commands are available to all members...');
    }
  } catch (error) {
    console.error('Error setting up permissions:', error);
  }
});

// Handle all interaction types
client.on('interactionCreate', async interaction => {
  try {
    // Log all incoming interactions for debugging
    console.log(`Interaction received from ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`Guild: ${interaction.guild ? interaction.guild.name : 'DM'} (${interaction.guild ? interaction.guild.id : 'N/A'})`);
    
    if (interaction.member) {
      console.log(`User roles: ${[...interaction.member.roles.cache.values()].map(r => r.name).join(', ')}`);
    }
    
    // Log permissions for slash commands
    if (interaction.isCommand()) {
      console.log(`Command: ${interaction.commandName}`);
      console.log(`User permissions: ${interaction.member ? JSON.stringify(interaction.member.permissions.toArray()) : 'N/A'}`);
      console.log(`Bot permissions: ${interaction.guild ? interaction.guild.members.me.permissions.toArray().join(', ') : 'N/A'}`);
      await commandHandler.handleCommand(interaction);
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      console.log(`Button: ${interaction.customId}`);
      await commandHandler.handleButton(interaction);
    }
    
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      console.log(`Modal: ${interaction.customId}`);
      await commandHandler.handleModalSubmit(interaction);
    }
  } catch (error) {
    console.error('Error in interaction handler:', error);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);