# Firebase Helper Scripts

This directory contains scripts to help you manage your Firebase database for the Discord NFT verification bot. These scripts simplify the process of setting up and managing your Firebase database, even if you're new to Firebase.

## Prerequisites

Before using these scripts:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
2. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely
3. Set the path to this file in your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-firebase-credentials.json
   ```

## Available Scripts

### 1. Firebase Setup Script

Initializes your Firebase database structure for the NFT verification bot.

```bash
node firebase-setup.js
```

This script will:
- Verify your Firebase credentials
- Create necessary collections (users, pending_verifications)
- Give guidance on setting up security rules

### 2. Firebase Utilities Script

Provides various useful commands for managing your Firebase database.

```bash
node firebase-utils.js [command]
```

Available commands:

- `stats` - View database statistics (user counts, NFT distribution)
- `export` - Export user data to a JSON file
- `clean` - Clean up expired verification requests
- `test` - Test database connection and operations
- `reset-user [discordId]` - Reset a specific user's verification
- `help` - Show help message

## Example Usage

```bash
# Setup your Firebase database
node firebase-setup.js

# View database statistics
node firebase-utils.js stats

# Export all user data
node firebase-utils.js export

# Reset a specific user
node firebase-utils.js reset-user userid
```

## Troubleshooting

**Error: Failed to initialize Firebase**
- Make sure your `GOOGLE_APPLICATION_CREDENTIALS` path is correct in your `.env` file
- Verify the service account has proper permissions

**Error: Permission denied**
- Make sure your Firebase service account has the necessary permissions
- Ensure your security rules allow server-side operations

**Can't find exported data**
- Exports are saved to an `exports` directory in your project root
- The filename includes a timestamp for uniqueness

## Further Help

For more help with Firebase:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
