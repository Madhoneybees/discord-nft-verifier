# Discord NFT Verification Bot: Deployment Guide with Linode

This guide documents the process of deploying the Discord NFT Verification Bot to a server.

## Prerequisites
- A server running Ubuntu (Linode, AWS, DigitalOcean, etc.)
- SSH access to the server
- Discord bot token and necessary API keys

## Step 1: Initial Server Setup

When you first get a new Linode server:

```bash
# SSH into your server
ssh root@your-server-ip

# Update the system
apt update && apt upgrade -y

# Create a non-root user (optional but recommended)
adduser yourusername
usermod -aG sudo yourusername

# Log out and log back in as the new user if created
# Otherwise continue using root for simplicity
```

## Step 2: Preparing Your Local Code
```bash
# On your local machine
cd /path/to/discord-nft-verifier
tar --exclude='node_modules' --exclude='.git' -czf /tmp/discord-bot.tar.gz .
```

## Step 3: Transferring Code to Server
```bash
# On your local machine - use appropriate username
scp /tmp/discord-bot.tar.gz root@server-ip:~
```

## Step 4: Setting Up the Server Environment
```bash
# SSH into your server - use appropriate username
ssh root@server-ip

# Install Node.js and npm if not already installed
apt update
apt install -y nodejs npm

# Install n to manage Node.js versions
npm install -g n
n lts

# Reload your shell to use the new Node.js version
exec $SHELL

# Verify Node.js installation
node -v
npm -v
```

## Step 5: Extracting and Setting Up Your Bot
```bash
# On the server
rm -rf ~/discord-nft-bot
mkdir -p ~/discord-nft-bot
tar -xzf ~/discord-bot.tar.gz -C ~/discord-nft-bot
cd ~/discord-nft-bot
```

## Step 6: Installing Dependencies
```bash
# Install production dependencies
npm ci --only=production

# If you encounter errors about deprecated packages, use:
npm install --omit=dev --no-fund --no-audit
```

## Step 7: Setting Up Environment Variables
```bash
# Create .env file
nano .env
```

Add the following to the .env file:
```
DISCORD_TOKEN=your_discord_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
# Add all Firebase configuration variables
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
```

## Step 8: Setting Up PM2 for Process Management
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your bot with PM2
pm2 start src/index.js --name discord-nft-bot

# Configure PM2 to start on boot
pm2 startup
# Run the command provided by the above output
pm2 save

# Check if your bot is running
pm2 list
pm2 logs discord-nft-bot
```

## Maintenance and Management

### Viewing Bot Logs
```bash
# View live logs
pm2 logs discord-nft-bot

# View recent logs
pm2 logs discord-nft-bot --lines 100
```

### Restarting the Bot
```bash
# Restart the bot
pm2 restart discord-nft-bot

# Stop the bot
pm2 stop discord-nft-bot

# Start the bot
pm2 start discord-nft-bot
```

### Updating Your Bot
```bash
# On your local machine, create a new tarball
cd /path/to/discord-nft-verifier
tar --exclude='node_modules' --exclude='.git' -czf /tmp/discord-bot.tar.gz .

# Transfer to server
scp /tmp/discord-bot.tar.gz root@server-ip:~

# On the server
cd ~
pm2 stop discord-nft-bot
rm -rf ~/discord-nft-bot
mkdir -p ~/discord-nft-bot
tar -xzf ~/discord-bot.tar.gz -C ~/discord-nft-bot
cd ~/discord-nft-bot
npm ci --only=production
pm2 restart discord-nft-bot
pm2 logs discord-nft-bot
```

### Common PM2 Commands
```bash
# List all processes
pm2 list

# Detailed info about a process
pm2 info discord-nft-bot

# Monitor CPU and memory
pm2 monit

# View all logs
pm2 logs

# Restart all processes
pm2 restart all

# Clear log files
pm2 flush
```

## Log Management

PM2 automatically handles log rotation, but logs can still grow large over time. Here's how to manage them:

### Log Rotation
PM2 uses the `pm2-logrotate` module which automatically rotates logs when they reach a certain size.

```bash
# Install the log rotate module
pm2 install pm2-logrotate

# Configure log rotation settings
pm2 set pm2-logrotate:max_size 10M  # Rotate when log reaches 10MB
pm2 set pm2-logrotate:compress true  # Compress logs when rotated
pm2 set pm2-logrotate:retain 5       # Keep 5 rotated logs
```

### Manually Managing Logs

```bash
# Clear all logs
pm2 flush

# Delete old log files
find ~/.pm2/logs -name "*.log*" -mtime +7 -exec rm {} \;

# Check log file sizes
du -sh ~/.pm2/logs/
```

### Reducing Log Output

If logs grow too quickly, consider:
1. Reducing debug output in your application code
2. Using log levels to only log important information in production
3. Implementing a more sophisticated logging strategy with tools like Winston

## Common Discord Permission Issues

When deploying the bot, you may encounter the following permission issues:

### Command Access Issues
- **Everyone Role Access**: Make sure the "everyone" role has permission to use slash commands. Discord sometimes restricts this by default.
  - Go to Server Settings > Integrations > Your Bot > Command Permissions
  - Ensure "@everyone" role has access to the bot commands

### Third-Party App Integration
- **App Access**: Verify that third-party app access is enabled for regular members.
  - Go to Server Settings > Integrations
  - Ensure "Allow members to use Application Commands" is turned ON
  - If you have restricted App access to admins only, regular users won't be able to use the bot commands

These permission settings are common issues that can prevent the bot from working properly, even if the deployment itself is successful. Always check these settings if users report that they cannot access the bot commands.
