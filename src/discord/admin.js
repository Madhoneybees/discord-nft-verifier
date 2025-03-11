async function handleUpdateSettingsCommand(interaction) {
    // Check admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: 'You need administrator permissions to use this command.',
        ephemeral: true
      });
    }
    
    const settingType = interaction.options.getString('type');
    const settingValue = interaction.options.getString('value');
    
    try {
      // Load current settings
      const settingsPath = path.join(__dirname, '../../config/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      
      // Update specific setting
      if (settingType === 'schedule') {
        settings.verification.scheduleInterval = settingValue;
      } else if (settingType === 'contract') {
        settings.collection.contractAddress = settingValue;
      } else if (settingType === 'batch-size') {
        settings.verification.batchSize = parseInt(settingValue);
      }
      
      // Save updated settings
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      
      // Restart verification job with new settings
      if (settingType === 'schedule') {
        global.verificationJob.stop();
        global.verificationJob = require('../jobs/verification').startVerificationJob();
      }
      
      return interaction.reply(`Setting "${settingType}" updated successfully to "${settingValue}".`);
    } catch (error) {
      console.error('Error updating settings:', error);
      return interaction.reply('An error occurred while updating settings.');
    }
  }