require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('@discordjs/builders');

// Define commands
const commands = [
  // Removed the /connect command to simplify user interaction
  
  new SlashCommandBuilder()
    .setName('bmad')
    .setDescription('Verify your NFT holdings and update your role')
    // Setting default permissions to 0 ensures EVERYONE can use this command
    .setDefaultMemberPermissions(0),
  
  new SlashCommandBuilder()
    .setName('verify-all')
    .setDescription('Admin only: Verify all users\' NFT holdings')
    // Requires ADMINISTRATOR permission (8)
    .setDefaultMemberPermissions('8'),
  
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your current NFT status and role')
    // Setting default permissions to 0 ensures EVERYONE can use this command
    .setDefaultMemberPermissions(0)
].map(command => command.toJSON());

// Deploy commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application slash commands...');

    // Register commands for the specific guild first (instant update)
    if (process.env.DISCORD_GUILD_ID) {
      console.log(`Registering commands for guild ${process.env.DISCORD_GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log('Guild commands registered immediately!'); 
    }

    // Also register commands globally for all guilds
    console.log('Registering commands globally (this may take up to an hour to propagate)...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log('Commands are now registered globally. This may take up to an hour to propagate to all Discord servers.');

    console.log('Successfully reloaded application slash commands!');
  } catch (error) {
    console.error('Error deploying commands:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Check for common errors
    if (error.message && (error.message.includes('Missing Access') || error.message.includes('permissions'))) {
      console.error('PERMISSION ERROR: The bot may not have the correct scopes or permissions.');
      console.error('Make sure your bot has the applications.commands scope in the OAuth2 URL.');
    }
    
    if (error.message && error.message.includes('rate limit')) {
      console.error('RATE LIMIT: You have hit Discord API rate limits. Try again later.');
    }
  }
})();