const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder,
    TextInputBuilder,
    ButtonStyle,
    TextInputStyle,
    EmbedBuilder
  } = require('discord.js');
  
  const { ethers } = require('ethers');
  const walletConnection = require('../wallet/connection');
  const nftVerification = require('../blockchain/nftVerification');
  const roleManager = require('../roles/manager');
  const db = require('../database/firebase');
  
  // Command registration data
  const commands = [
    new SlashCommandBuilder()
      .setName('bmad')
      .setDescription('Verify your wallet to receive NFT roles'),
    
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Check your NFT verification status'),
    
    new SlashCommandBuilder()
      .setName('verify-all')
      .setDescription('Admin command to verify all users in the server')
      .setDefaultMemberPermissions(0),
    
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Learn about the verification process and security')
  ];
  
  // Handle slash commands
  async function handleCommand(interaction) {
    // Log command usage for debugging
    console.log(`Command received: ${interaction.commandName} from user: ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`Guild: ${interaction.guild ? interaction.guild.name : 'DM'} (${interaction.guild ? interaction.guild.id : 'N/A'})`);
    console.log(`User roles: ${interaction.member ? [...interaction.member.roles.cache.values()].map(r => r.name).join(', ') : 'N/A'}`);

      try {
      
      if (interaction.commandName === 'bmad') {
        await handleVerifyCommand(interaction);
      } else if (interaction.commandName === 'status') {
        await handleStatusCommand(interaction);
      } else if (interaction.commandName === 'verify-all') {
        await handleVerifyAllCommand(interaction);
      } else if (interaction.commandName === 'help') {
        await handleHelpCommand(interaction);
      } else {
        console.warn(`Unknown command: ${interaction.commandName}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Unknown command. Please try again with a valid command.',
            ephemeral: true
          }).catch(e => console.error('Error replying to unknown command:', e));
        }
      }
    } catch (error) {
      console.error(`Error handling command ${interaction.commandName}:`, error);
      
      try {
        // Only attempt to respond if the interaction is still valid
        if (interaction.deferred && !interaction.replied) {
          // If deferred but not replied, use editReply
          console.log('Attempting to edit reply with error message');
          await interaction.editReply({
            content: 'There was an error while processing your command. Please try again later.'
          }).catch(e => console.error('Error editing reply after command error:', e));
        } else if (!interaction.replied && !interaction.deferred) {
          // If not replied to yet and not deferred, use reply
          console.log('Attempting to reply with error message');
          await interaction.reply({
            content: 'There was an error while processing your command. Please try again later.',
            ephemeral: true
          }).catch(e => console.error('Error replying after command error:', e));
        } else if (interaction.replied) {
          // If already replied, use followUp
          console.log('Attempting to follow up with error message');
          await interaction.followUp({
            content: 'There was an error while processing your command. Please try again later.',
            ephemeral: true
          }).catch(e => console.error('Error following up after command error:', e));
        }
      } catch (followupError) {
        console.error('Failed to send error response:', followupError);
      }
    }
  }
  
  // Handle status command
  async function handleStatusCommand(interaction) {
    const userId = interaction.user.id;
    console.log(`Processing status command for user: ${userId}`);
    
    // Track whether we've deferred the reply
    let hasDeferred = false;
    
    try {
      // Defer the reply
      console.log('Deferring reply...');
      await interaction.deferReply({ ephemeral: true });
      hasDeferred = true;
      console.log('Reply deferred successfully');
      
      // Get user data from database
      const userData = await db.users.get(userId);
      
      if (!userData || !userData.wallet_address) {
        console.log('No wallet found for user');
        await interaction.editReply({
          content: "You haven't verified a wallet yet. Use the /bmad command to get started!"
        });
        return;
      }
      
      // Format wallet address for display
      const walletAddress = userData.wallet_address;
      const formattedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      console.log(`Found wallet: ${formattedWallet}`);
      
      // Get LIVE NFT count directly from blockchain
      console.log('Fetching NFT count from blockchain...');
      const currentNFTCount = await nftVerification.getNFTCount(walletAddress);
      console.log(`Current NFT count: ${currentNFTCount}`);
      
      // Check if database needs update
      if (currentNFTCount !== userData.nft_count) {
        console.log(`Updating NFT count for ${userId}: ${userData.nft_count || 0} → ${currentNFTCount}`);
        
        // Update in database
        await db.users.update(userId, {
          nft_count: currentNFTCount,
          last_verified: new Date()
        });
        
        // Update role if needed
        await roleManager.updateUserRole(userId, currentNFTCount);
      }
      
      // Get role info
      const memberRole = userData.role || 
        (currentNFTCount > 0 ? `Mad Bear Holder (${currentNFTCount})` : 'None');
      
      // Create embed with status info
      const statusEmbed = new EmbedBuilder()
        .setTitle('🐻 Your Mad Bears Status')
        .setColor(0x5865F2)
        .addFields(
          { name: 'Connected Wallet', value: formattedWallet },
          { name: 'NFT Count', value: currentNFTCount.toString() },
          { name: 'Role', value: memberRole },
          { name: 'Last Verified', value: new Date().toLocaleString() }
        );
      
      console.log('Sending status embed...');
      await interaction.editReply({
        embeds: [statusEmbed]
      });
      console.log('Status command completed successfully');
      
    } catch (error) {
      console.error('Error handling status command:', error);
      
      // Only attempt to respond if we haven't already
      try {
        if (hasDeferred) {
          // If we've deferred, use editReply
          console.log('Attempting to edit reply with error message');
          await interaction.editReply({
            content: "There was an error checking your status. Please try again later."
          }).catch(e => {
            console.error('Failed to edit reply with error message:', e);
          });
        } else if (!interaction.replied && !interaction.deferred) {
          // If we haven't replied or deferred, use reply
          console.log('Attempting to reply with error message');
          await interaction.reply({
            content: "There was an error checking your status. Please try again later.",
            ephemeral: true
          }).catch(e => {
            console.error('Failed to reply with error message:', e);
          });
        }
      } catch (followupError) {
        console.error('Failed to send error response:', followupError);
      }
    }
  }
  
  // Handle verify-all command (admin only)
  async function handleVerifyAllCommand(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({
        content: "You don't have permission to use this command. It requires administrator privileges.",
        ephemeral: true
      });
      return;
    }
    
    await interaction.reply({
      content: "Starting verification for all users with connected wallets. This may take some time...",
      ephemeral: true
    });
    
    try {
      const verification = require('../jobs/verification');
      const result = await verification.triggerManualVerification();
      
      await interaction.followUp({
        content: `Verification complete! Processed ${result.processed} users.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in verify-all command:', error);
      await interaction.followUp({
        content: "There was an error during verification. Please check the logs for details.",
        ephemeral: true
      });
    }
  }
  
  // Handle verify command - initial entry point
  async function handleVerifyCommand(interaction) {
    await interaction.reply({
      content: "Let's verify your wallet to receive NFT roles!",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('enter_wallet')
            .setLabel('Enter Wallet Address')
            .setStyle(ButtonStyle.Primary)
        )
      ],
      ephemeral: true
    });
  }
  
  // Handle button interactions
  async function handleButton(interaction) {
    const buttonId = interaction.customId;
    
    try {
      console.log(`Button clicked: ${buttonId} by user: ${interaction.user.tag} (${interaction.user.id})`);
      
      if (buttonId === 'enter_wallet') {
        await handleEnterWalletButton(interaction);
      } else if (buttonId === 'submit_signature') {
        await handleSubmitSignatureButton(interaction);
      } else if (buttonId === 'restart_verification') {
        await handleVerifyCommand(interaction);
      } else {
        console.warn(`Unknown button ID: ${buttonId}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Unknown button interaction. Please try again.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error(`Error handling button ${buttonId}:`, error);
      
      try {
        // Check interaction state and respond accordingly
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error processing your request. Please try again later.',
            ephemeral: true
          });
        }
      } catch (followupError) {
        console.error('Failed to send error response for button:', followupError);
      }
    }
  }
  
  // Handle enter wallet button
  async function handleEnterWalletButton(interaction) {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId('wallet_address_modal')
        .setTitle('Enter Your Wallet Address')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('wallet_address_input')
              .setLabel('Bera / EVM Wallet Address')
              .setStyle(TextInputStyle.Short)
              .setMinLength(42)
              .setMaxLength(42)
              .setPlaceholder('0x...')
              .setRequired(true)
          )
        )
    );
  }
  
  // Handle wallet address modal submission
  async function handleWalletAddressModal(interaction) {
    const walletAddress = interaction.fields.getTextInputValue('wallet_address_input');
    
    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      return interaction.reply({
        content: 'Invalid wallet address format. Please try again with a valid Ethereum address.',
        ephemeral: true
      });
    }
    
    // Generate verification message
    const message = walletConnection.generateVerificationMessage(
      interaction.user,
      interaction.guild,
      walletAddress
    );
    
    // Format wallet address for display (0x1234...5678)
    const formattedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    
    // Send verification instructions
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔐 Sign Message to Verify Wallet')
          .setDescription(`Please sign the following message with your wallet (${formattedWallet}) to verify ownership:`)
          .addFields(
            { name: 'Message to Sign', value: `\`\`\`\n${message}\n\`\`\`` },
            { name: 'Instructions', value: 
                '1. Copy the message above\n' +
                '2. Go to [Berascan Verified Signatures](https://berascan.com/verifiedSignatures), select "Sign Message", and connect your wallet\n' +
                '3. Paste the message and sign with your wallet\n' +
                '4. Copy the Signature Hash\n' + 
                '5. Click the button below and paste your signature'
            }
          )
          .setColor(0x5865F2)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('submit_signature')
            .setLabel('Submit Signature')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('restart_verification')
            .setLabel('Restart')
            .setStyle(ButtonStyle.Secondary)
        )
      ],
      ephemeral: true
    });
  }
  
  // Handle submit signature button
  async function handleSubmitSignatureButton(interaction) {
    try {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId('signature_modal')
          .setTitle('Paste Your Signature')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('signature_input')
                .setLabel('Wallet Signature')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('0x1234abcd...')
                .setRequired(true)
            )
          )
      );
    } catch (error) {
      console.error('Error showing signature modal:', error);
      // Only attempt to reply if the interaction hasn't been replied to yet
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'An error occurred. Please try again later.',
            ephemeral: true
          });
        } catch (followupError) {
          console.error('Failed to send error response for modal:', followupError);
        }
      }
    }
  }
  
  // Handle signature modal submission
  async function handleSignatureModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const signature = interaction.fields.getTextInputValue('signature_input');
    
    try {
      // Verify the signature
      const result = await walletConnection.verifySignature(interaction.user.id, signature);
      
      if (!result.success) {
        return interaction.editReply({
          content: `❌ Verification failed: ${result.error}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('restart_verification')
                .setLabel('Try Again')
                .setStyle(ButtonStyle.Primary)
            )
          ]
        });
      }
      
      // Signature verified! Now check NFTs and assign roles
      const walletAddress = result.walletAddress;
      const nftCount = await nftVerification.getNFTCount(walletAddress);
      const role = await roleManager.updateUserRole(interaction.user.id, nftCount);
      
      // Format wallet address for display
      const formattedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      
      // Send success message with role description
      const embed = new EmbedBuilder()
        .setTitle('✅ Wallet Verified Successfully!')
        .setDescription(`Your wallet has been verified and roles have been assigned.`)
        .addFields(
          { name: 'Wallet', value: formattedWallet, inline: true },
          { name: 'NFTs Detected', value: nftCount.toString(), inline: true },
          { name: 'Role Assigned', value: role.name || 'None', inline: true }
        )
        .setColor(0x00FF00);
      
      // Add role description if available
      if (role.description) {
        embed.addFields({ name: 'Role Description', value: role.description, inline: false });
      }
      
      return interaction.editReply({
        embeds: [embed]
      });
    } catch (error) {
      console.error('Error in signature verification:', error);
      return interaction.editReply({
        content: 'An error occurred during verification. Please try again later.',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('restart_verification')
              .setLabel('Try Again')
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });
    }
  }
  
  // Handle modal submissions
  async function handleModalSubmit(interaction) {
    const modalId = interaction.customId;
    
    try {
      console.log(`Processing modal submission: ${modalId} from user: ${interaction.user.tag} (${interaction.user.id})`);
      
      if (modalId === 'wallet_address_modal') {
        await handleWalletAddressModal(interaction);
      } else if (modalId === 'signature_modal') {
        await handleSignatureModal(interaction);
      } else {
        console.warn(`Unknown modal ID: ${modalId}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Unknown form submission. Please try again.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error(`Error handling modal ${modalId}:`, error);
      
      try {
        // Check interaction state and respond accordingly
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content: 'There was an error processing your input. Please try again later.'
          });
        } else if (!interaction.replied) {
          await interaction.reply({
            content: 'There was an error processing your input. Please try again later.',
            ephemeral: true
          });
        }
      } catch (followupError) {
        console.error('Failed to send error response for modal:', followupError);
      }
    }
  }
  
  // Handle help command
  async function handleHelpCommand(interaction) {
    try {
      const helpEmbed = new EmbedBuilder()
        .setColor('#FFC72C')
        .setTitle('🔒 NFT Verification: How It Works & Why It\'s Safe')
        .setDescription('Here\'s how our verification process works and why you can trust it.')
        .addFields(
          { 
            name: '📝 What Happens When You Verify', 
            value: '1️⃣ You sign a unique message with your wallet\n2️⃣ This proves NFT ownership without sharing private keys\n3️⃣ Our bot automatically assigns your roles based on your NFTs' 
          },
          { 
            name: '✅ Why This Is Secure', 
            value: '• You only sign a message, never a transaction\n• Your private keys remain private\n• We verify ownership through cryptographic signatures\n• Each verification code is unique and single-use\n• Industry-standard authentication used by top Web3 platforms' 
          },
          { 
            name: '❌ Red Flags to Watch For', 
            value: '• Never share your seed phrase or private keys\n• Never approve spending/transfer transactions for verification\n• Never click suspicious links claiming to be part of our verification' 
          },
          { 
            name: '🤔 Need Help?', 
            value: 'If you have questions or concerns about the verification process, please ask in our support channel, and our team will be happy to assist you!' 
          }
        )
        .setFooter({ text: 'MadHoneyBees deeply values your security and will never DM you first about verification.' });

      await interaction.reply({
        embeds: [helpEmbed],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error handling help command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'There was an error displaying the help information. Please try again later.',
          ephemeral: true
        }).catch(e => console.error('Error replying to help command:', e));
      }
    }
  }
  
  module.exports = {
    commands,
    handleCommand,
    handleButton,
    handleModalSubmit
  };