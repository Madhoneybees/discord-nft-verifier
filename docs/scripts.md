# Utility Scripts

This document explains the utility scripts included with the Discord NFT Verification Bot that help with database management, testing, and troubleshooting.

## Scripts Overview

| Script | Purpose |
|--------|---------|
| `firebase-setup.js` | Initialize Firebase database structure |
| `firebase-utils.js` | Database maintenance and utilities |
| `debug-nft-balance.js` | Test NFT balance checking functionality |
| `deploy-commands.js` | Register slash commands with Discord |

## Firebase Setup Script

Initializes your Firebase database structure for the NFT verification bot.

```bash
node scripts/firebase-setup.js
```

This script will:
- Verify your Firebase credentials
- Create necessary collections (users, pending_verifications)
- Give guidance on setting up security rules

## Firebase Utilities Script

Provides various useful commands for managing your Firebase database.

```bash
node scripts/firebase-utils.js [command]
```

Available commands:

- `stats` - View database statistics (user counts, NFT distribution)
- `export` - Export user data to a JSON file
- `clean` - Clean up expired verification requests
- `test` - Test database connection and operations
- `reset-user [userid]` - Reset a specific user's verification
- `help` - Show help message

### Example Usage

```bash
# Show statistics about verified users
node scripts/firebase-utils.js stats

# Export all user data to JSON file
node scripts/firebase-utils.js export

# Reset a specific user
node scripts/firebase-utils.js reset-user userid
```

## NFT Balance Debugging

Test the NFT balance checking functionality for a specific wallet address:

```bash
node scripts/debug-nft-balance.js
```

The script will:
1. Use the configured blockchain RPC endpoint from settings.json
2. Attempt to query NFT balance for the wallet address defined in the script
3. Output detailed blockchain response and error information

This is useful for testing blockchain connectivity and NFT contract integrations.

## Deploy Commands Script

Register or update the bot's slash commands with Discord:

```bash
node scripts/deploy-commands.js
```

This script must be run:
- When first setting up the bot
- Any time you modify, add, or remove slash commands
- After updating the bot's command permissions or structure

It uses your DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID from the .env file.

## Troubleshooting Scripts

If you encounter issues running scripts:

1. **Environment Variables**: Make sure your `.env` file is properly configured with all required variables
2. **Directory Structure**: Run scripts from the project root directory, not from within the scripts folder
3. **Node Version**: Ensure you're running Node.js v16 or higher
4. **Dependencies**: Make sure all dependencies are installed with `npm install`
5. **Permissions**: Some scripts may require additional permissions (especially for Firebase operations)

For more detailed troubleshooting, refer to the [Troubleshooting Guide](./troubleshooting.md).
