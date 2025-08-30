require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});
const TOKEN = process.env.TOKEN;
const PORT = 3000;

let voiceLogChannelId = null;
let welcomeChannelId = null;
let goodbyeChannelId = null;
let stickyMessages = new Map();
let applicationChannelId = null;
let applicationLogChannelId = null;
let applicationPanelMessageId = null;
let applicationPanelChannelId = null;

// ===== Slash Commands =====

// Kick
const kickCommand = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a member from the server')
  .addUserOption(opt => opt.setName('target').setDescription('User to kick').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

// Ban
const banCommand = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a member from the server')
  .addUserOption(opt => opt.setName('target').setDescription('User to ban').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

// Warn
const warnCommand = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Issues a warning to a member')
  .addUserOption(opt => opt.setName('target').setDescription('User to warn').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// Say
const sayCommand = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Make the bot say something')
  .addStringOption(opt => opt.setName('message').setDescription('Message to say').setRequired(true));

// Give Role
const giveRoleCommand = new SlashCommandBuilder()
  .setName('giverole')
  .setDescription('Give a role to a user')
  .addUserOption(opt => opt.setName('target').setDescription('User to give role').setRequired(true))
  .addRoleOption(opt => opt.setName('role').setDescription('Role to give').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

// Remove Role
const removeRoleCommand = new SlashCommandBuilder()
  .setName('removerole')
  .setDescription('Remove a role from a user')
  .addUserOption(opt => opt.setName('target').setDescription('User to remove role').setRequired(true))
  .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

// Mute (timeout)
const muteCommand = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Timeout (mute) a user for 10 minutes')
  .addUserOption(opt => opt.setName('target').setDescription('User to mute').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// Unmute
const unmuteCommand = new SlashCommandBuilder()
  .setName('unmute')
  .setDescription('Remove timeout (unmute) from a user')
  .addUserOption(opt => opt.setName('target').setDescription('User to unmute').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// Move
const moveCommand = new SlashCommandBuilder()
  .setName('move')
  .setDescription('Move a user to another voice channel')
  .addUserOption(opt => opt.setName('target').setDescription('User to move').setRequired(true))
  .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel to move to').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

// Lock channel
const lockCommand = new SlashCommandBuilder()
  .setName('lockchannel')
  .setDescription('Lock the current channel (prevent @everyone from sending messages)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

// Unlock channel
const unlockCommand = new SlashCommandBuilder()
  .setName('unlockchannel')
  .setDescription('Unlock the current channel (allow @everyone to send messages)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

// Help
const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available bot commands');

// Set Voice Log Channel
const setVoiceLogCommand = new SlashCommandBuilder()
  .setName('setvoicelog')
  .setDescription('Set the channel where voice join/leave logs will be sent')
  .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Set Welcome Channel
const setWelcomeCommand = new SlashCommandBuilder()
  .setName('setwelcome')
  .setDescription('Set the channel where welcome messages will be sent')
  .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Set Goodbye Channel
const setGoodbyeCommand = new SlashCommandBuilder()
  .setName('setgoodbye')
  .setDescription('Set the channel where goodbye messages will be sent')
  .addChannelOption(opt => opt.setName('channel').setDescription('Goodbye channel').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Set a Sticky Message
const stickyMessageCommand = new SlashCommandBuilder()
  .setName('stickymessage')
  .setDescription('Manage sticky messages')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Sets a sticky message that is always at the bottom of the channel')
      .addStringOption(opt => opt.setName('message').setDescription('The message to stick').setRequired(true))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Removes the sticky message from the current channel')
  );

// Application Form Setup
const setApplicationChannelCommand = new SlashCommandBuilder()
  .setName('setapplicationchannel')
  .setDescription('Sets the channel where submitted applications will be sent')
  .addChannelOption(opt => opt.setName('channel').setDescription('The channel for applications').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setApplicationLogChannelCommand = new SlashCommandBuilder()
  .setName('setapplicationlogchannel')
  .setDescription('Sets the channel where application accept/reject logs will be sent')
  .addChannelOption(opt => opt.setName('channel').setDescription('The channel for logs').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const applicationPanelCommand = new SlashCommandBuilder()
  .setName('applicationpanel')
  .setDescription('Creates the application form panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const closeApplicationCommand = new SlashCommandBuilder()
  .setName('closeapplication')
  .setDescription('Closes the whitelist application process')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const openApplicationCommand = new SlashCommandBuilder()
  .setName('openapplication')
  .setDescription('Opens the whitelist application process')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// ===== Register Commands =====
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Bot status
  client.user.setPresence({
    activities: [{ name: 'moderating the server 👀', type: 3 }],
    status: 'online'
  });

  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, "YOUR_GUILD_ID"), // Replace with your server ID
      {
        body: [
          kickCommand.toJSON(),
          banCommand.toJSON(),
          warnCommand.toJSON(),
          sayCommand.toJSON(),
          giveRoleCommand.toJSON(),
          removeRoleCommand.toJSON(),
          muteCommand.toJSON(),
          unmuteCommand.toJSON(),
          moveCommand.toJSON(),
          lockCommand.toJSON(),
          unlockCommand.toJSON(),
          helpCommand.toJSON(),
          setVoiceLogCommand.toJSON(),
          setWelcomeCommand.toJSON(),
          setGoodbyeCommand.toJSON(),
          stickyMessageCommand.toJSON(),
          setApplicationChannelCommand.toJSON(),
          setApplicationLogChannelCommand.toJSON(),
          applicationPanelCommand.toJSON(),
          closeApplicationCommand.toJSON(),
          openApplicationCommand.toJSON()
        ]
      }
    );
    console.log('📤 Commands registered (guild only)');
  } catch (err) {
    console.error('❌ Command registration failed:', err);
  }
});

// ===== Handle Interactions =====
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    try {
      if (commandName === 'kick') {
        const user = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.kick();
        return interaction.reply(`✅ Kicked ${user.tag}`);
      }

      if (commandName === 'ban') {
        const user = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.ban();
        return interaction.reply(`✅ Banned ${user.tag}`);
      }

      if (commandName === 'warn') {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      
        if (!member) {
          return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });
        }
      
        const warningEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("🚫 User Warned")
          .setDescription(`**${member.user.tag}** has been warned by **${interaction.user.tag}**`)
          .addFields(
            { name: "Reason", value: reason }
          )
          .setFooter({ text: `User ID: ${user.id}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [warningEmbed] });
      
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("⚠️ You have been warned!")
            .setDescription(`You have received a warning in **${interaction.guild.name}** for the following reason:`)
            .addFields(
              { name: "Reason", value: reason }
            )
            .setFooter({ text: "Please review the server rules to avoid further action." })
            .setTimestamp();
      
          await user.send({ embeds: [dmEmbed] });
        } catch (err) {
          console.error(`Failed to DM user ${user.tag}: ${err}`);
        }
      }

      if (commandName === 'say') {
        const message = interaction.options.getString('message');
        return interaction.reply({ content: message });
      }

      if (commandName === 'giverole') {
        const user = interaction.options.getUser('target');
        const role = interaction.options.getRole('role');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.roles.add(role);
        return interaction.reply(`✅ Added role ${role.name} to ${user.tag}`);
      }

      if (commandName === 'removerole') {
        const user = interaction.options.getUser('target');
        const role = interaction.options.getRole('role');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.roles.remove(role);
        return interaction.reply(`✅ Removed role ${role.name} from ${user.tag}`);
      }

      if (commandName === 'mute') {
        const user = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.timeout(10 * 60 * 1000);
        return interaction.reply(`✅ Muted ${user.tag} for 10 minutes`);
      }

      if (commandName === 'unmute') {
        const user = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply('⚠️ User not found.');
        await member.timeout(null);
        return interaction.reply(`✅ Unmuted ${user.tag}`);
      }

      if (commandName === 'move') {
        const user = interaction.options.getUser('target');
        const channel = interaction.options.getChannel('channel');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member || !member.voice.channel) return interaction.reply('⚠️ User not in a voice channel.');
        await member.voice.setChannel(channel);
        return interaction.reply(`✅ Moved ${user.tag} to ${channel.name}`);
      }

      if (commandName === 'lockchannel') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        return interaction.reply('🔒 Channel locked.');
      }

      if (commandName === 'unlockchannel') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        return interaction.reply('🔓 Channel unlocked.');
      }

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("🤖 Bot Help Menu")
          .setDescription("Here are all the available commands you can use:")
          .addFields(
            {
              name: "⚙️ Moderation",
              value: "/kick @user → Kick a member\n/ban @user → Ban a member\n/mute @user → Mute (10 min)\n/unmute @user → Unmute a member\n/warn @user <reason> → Issue a warning"
            },
            {
              name: "👥 Role Management",
              value: "/giverole @user @role → Give a role\n/removerole @user @role → Remove a role"
            },
            {
              name: "🎙 Voice",
              value: "/move @user #channel → Move a user to a voice channel"
            },
            {
              name: "🔒 Channels",
              value: "/lockchannel → Lock this channel\n/unlockchannel → Unlock this channel"
            },
            {
              name: "💬 Utility",
              value: "/say text → Bot repeats your text\n/help → Show this help menu\n/setvoicelog #channel → Set voice log channel\n/setwelcome #channel → Set welcome channel\n/setgoodbye #channel → Set goodbye channel"
            },
            {
              name: "🗣 Community",
              value: "/stickymessage set <message> → Sets a message to stick at the bottom of the channel\n/stickymessage remove → Removes the sticky message\n/applicationpanel → Creates the application form panel\n/setapplicationchannel → Sets the channel for applications\n/setapplicationlogchannel → Sets the channel for application logs\n/closeapplication → Closes the application process\n/openapplication → Opens the application process"
            }
          )
          .setFooter({ text: "Made by Rick | Moderation Bot" })
          .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed] });
      }

      if (commandName === 'setvoicelog') {
        const channel = interaction.options.getChannel('channel');
        voiceLogChannelId = channel.id;
        return interaction.reply(`✅ Voice log channel set to ${channel}`);
      }
      
      if (commandName === 'setwelcome') {
        const channel = interaction.options.getChannel('channel');
        welcomeChannelId = channel.id;
        return interaction.reply(`✅ Welcome channel set to ${channel}`);
      }

      if (commandName === 'setgoodbye') {
        const channel = interaction.options.getChannel('channel');
        goodbyeChannelId = channel.id;
        return interaction.reply(`✅ Goodbye channel set to ${channel}`);
      }

      if (commandName === 'stickymessage') {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;

        if (subcommand === 'set') {
          const messageContent = interaction.options.getString('message');
      
          if (stickyMessages.has(channelId)) {
            const oldMessageId = stickyMessages.get(channelId);
            try {
              const oldMessage = await interaction.channel.messages.fetch(oldMessageId);
              await oldMessage.delete();
            } catch (err) {
              console.error(`Failed to delete old sticky message: ${err}`);
            }
          }
      
          const stickyEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📌 Sticky Message")
            .setDescription(messageContent)
            .setFooter({ text: "This message will stay at the bottom of the channel." });
      
          const newMessage = await interaction.channel.send({ embeds: [stickyEmbed] });
          stickyMessages.set(channelId, newMessage.id);
      
          return interaction.reply({ content: `✅ Sticky message set in this channel!`, ephemeral: true });
        }
      
        if (subcommand === 'remove') {
          if (!stickyMessages.has(channelId)) {
            return interaction.reply({ content: '❌ There is no sticky message to remove in this channel.', ephemeral: true });
          }
      
          const stickyMessageId = stickyMessages.get(channelId);
          try {
            const oldMessage = await interaction.channel.messages.fetch(stickyMessageId);
            await oldMessage.delete();
            stickyMessages.delete(channelId);
            return interaction.reply({ content: '✅ Sticky message has been removed from this channel.', ephemeral: true });
          } catch (err) {
            console.error(`Failed to delete sticky message: ${err}`);
            return interaction.reply({ content: '❌ An error occurred while trying to remove the sticky message.', ephemeral: true });
          }
        }
      }

      if (commandName === 'setapplicationchannel') {
        const channel = interaction.options.getChannel('channel');
        applicationChannelId = channel.id;
        return interaction.reply(`✅ Application channel set to ${channel}`);
      }

      if (commandName === 'setapplicationlogchannel') {
        const channel = interaction.options.getChannel('channel');
        applicationLogChannelId = channel.id;
        return interaction.reply(`✅ Application log channel set to ${channel}`);
      }

      if (commandName === 'applicationpanel') {
        const applicationEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('📝 WHITELIST APPLICATION')
          .setDescription('Note: Apply here for WHITELIST application')
          .setFooter({ text: 'Created by Redemption' });
        
        const applyButton = new ButtonBuilder()
          .setCustomId('application_form')
          .setLabel('Apply Here')
          .setStyle(ButtonStyle.Success);
        
        const row = new ActionRowBuilder()
          .addComponents(applyButton);
          
        const message = await interaction.reply({
          embeds: [applicationEmbed],
          components: [row]
        });
        
        applicationPanelMessageId = message.id;
        applicationPanelChannelId = interaction.channel.id;
      }

      if (commandName === 'closeapplication') {
        if (!applicationPanelMessageId) {
          return interaction.reply({ content: '❌ The application panel has not been created yet.', ephemeral: true });
        }
        
        const panelChannel = interaction.guild.channels.cache.get(applicationPanelChannelId);
        if (!panelChannel) {
          return interaction.reply({ content: '❌ The application panel channel no longer exists.', ephemeral: true });
        }
        
        const panelMessage = await panelChannel.messages.fetch(applicationPanelMessageId);
        
        const closedEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🔒 WHITELIST APPLICATIONS CLOSED')
          .setDescription('This application is currently closed. We will open soon, so check back for an update!')
          .setFooter({ text: 'Created by Redemption' });
        
        await panelMessage.edit({ embeds: [closedEmbed], components: [] });
        return interaction.reply({ content: '✅ The application process has been closed.', ephemeral: true });
      }

      if (commandName === 'openapplication') {
        if (!applicationPanelMessageId) {
          return interaction.reply({ content: '❌ The application panel has not been created yet.', ephemeral: true });
        }
        
        const panelChannel = interaction.guild.channels.cache.get(applicationPanelChannelId);
        if (!panelChannel) {
          return interaction.reply({ content: '❌ The application panel channel no longer exists.', ephemeral: true });
        }

        const panelMessage = await panelChannel.messages.fetch(applicationPanelMessageId);
        
        const openEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('📝 WHITELIST APPLICATION')
          .setDescription('Note: Apply here for WHITELIST application')
          .setFooter({ text: 'Created by Redemption' });

        const applyButton = new ButtonBuilder()
          .setCustomId('application_form')
          .setLabel('Apply Here')
          .setStyle(ButtonStyle.Success);
        
        const row = new ActionRowBuilder()
          .addComponents(applyButton);
          
        await panelMessage.edit({ embeds: [openEmbed], components: [row] });
        return interaction.reply({ content: '✅ The application process has been opened.', ephemeral: true });
      }

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `❌ Error: ${err.message}` });
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    if (interaction.customId === 'application_form') {
      const modal = new ModalBuilder()
        .setCustomId('application_modal')
        .setTitle('WHITELIST APPLICATION');

      const nameInput = new TextInputBuilder()
        .setCustomId('nameInput')
        .setLabel("What is your Name?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const ageInput = new TextInputBuilder()
        .setCustomId('ageInput')
        .setLabel("What is your Age?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      
      const ingameNameInput = new TextInputBuilder()
        .setCustomId('ingameNameInput')
        .setLabel("What is your IngameName?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const experienceInput = new TextInputBuilder()
        .setCustomId('experienceInput')
        .setLabel("Any Experience on Roleplay?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const emailInput = new TextInputBuilder()
        .setCustomId('emailInput')
        .setLabel("What is your Email Id?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(nameInput);
      const secondRow = new ActionRowBuilder().addComponents(ageInput);
      const thirdRow = new ActionRowBuilder().addComponents(ingameNameInput);
      const fourthRow = new ActionRowBuilder().addComponents(experienceInput);
      const fifthRow = new ActionRowBuilder().addComponents(emailInput);
      
      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

      await interaction.showModal(modal);
    }
    
    if (interaction.customId === 'accept_application' || interaction.customId === 'reject_application') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: "You do not have permission to use these buttons.", ephemeral: true });
      }

      const originalEmbed = interaction.message.embeds[0];
      const applicantId = originalEmbed.footer.text.split(' ')[2];
      const messageId = interaction.message.id;
      
      const modal = new ModalBuilder()
        .setCustomId(`${interaction.customId}_${messageId}_${applicantId}`)
        .setTitle('Provide a Reason');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reasonInput')
        .setLabel("Why are you making this decision?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
      
      const firstRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(firstRow);
      
      await interaction.showModal(modal);
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'application_modal') {
      const nameAnswer = interaction.fields.getTextInputValue('nameInput');
      const ageAnswer = interaction.fields.getTextInputValue('ageInput');
      const ingameNameAnswer = interaction.fields.getTextInputValue('ingameNameInput');
      const experienceAnswer = interaction.fields.getTextInputValue('experienceInput');
      const emailAnswer = interaction.fields.getTextInputValue('emailInput');
      const user = interaction.user;

      if (!applicationChannelId) {
        return interaction.reply({ content: '❌ The application channel has not been set by an admin.', ephemeral: true });
      }

      const applicationChannel = interaction.guild.channels.cache.get(applicationChannelId);
      if (!applicationChannel) {
        return interaction.reply({ content: '❌ The application channel no longer exists.', ephemeral: true });
      }

      const applicationEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📝 New WHITELIST Application')
        .setDescription(`Application submitted by ${user}`)
        .addFields(
          { name: 'Name', value: nameAnswer, inline: true },
          { name: 'Age', value: ageAnswer, inline: true },
          { name: 'IngameName', value: ingameNameAnswer, inline: true },
          { name: 'Roleplay Experience', value: experienceAnswer },
          { name: 'Email Id', value: emailAnswer, inline: true }
        )
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();
      
      const acceptButton = new ButtonBuilder()
        .setCustomId('accept_application')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);
      
      const rejectButton = new ButtonBuilder()
        .setCustomId('reject_application')
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder()
        .addComponents(acceptButton, rejectButton);
      
      await applicationChannel.send({ embeds: [applicationEmbed], components: [buttonRow] });
      await interaction.reply({ content: '✅ Your application has been submitted successfully!', ephemeral: true });
    }

    if (interaction.customId.startsWith('accept_application_') || interaction.customId.startsWith('reject_application_')) {
      const [buttonType, messageId, applicantId] = interaction.customId.split('_');
      const reason = interaction.fields.getTextInputValue('reasonInput');

      const originalMessage = await interaction.channel.messages.fetch(messageId);
      const originalEmbed = originalMessage.embeds[0];
      const newEmbed = new EmbedBuilder(originalEmbed.toJSON());

      if (buttonType === 'accept_application') {
        newEmbed.setTitle('✅ WHITELIST APPLICATION ACCEPTED').setColor(0x57F287);
        newEmbed.addFields({ name: 'Reason for Acceptance', value: reason });
        await interaction.reply({ content: 'Application has been marked as Accepted.', ephemeral: true });

        if (applicationLogChannelId) {
          const logChannel = interaction.guild.channels.cache.get(applicationLogChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle("✅ Application Accepted")
              .setDescription(`Application from **<@${applicantId}>** was accepted by **${interaction.user.tag}**`)
              .addFields({ name: 'Reason', value: reason })
              .setFooter({ text: `User ID: ${applicantId}` })
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } else if (buttonType === 'reject_application') {
        newEmbed.setTitle('❌ WHITELIST APPLICATION REJECTED').setColor(0xED4245);
        newEmbed.addFields({ name: 'Reason for Rejection', value: reason });
        await interaction.reply({ content: 'Application has been marked as Rejected.', ephemeral: true });

        if (applicationLogChannelId) {
          const logChannel = interaction.guild.channels.cache.get(applicationLogChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle("❌ Application Rejected")
              .setDescription(`Application from **<@${applicantId}>** was rejected by **${interaction.user.tag}**`)
              .addFields({ name: 'Reason', value: reason })
              .setFooter({ text: `User ID: ${applicantId}` })
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      }

      await originalMessage.edit({ embeds: [newEmbed], components: [] });
    }
  }
});

// ===== Voice Channel Join/Leave Logs =====
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (!voiceLogChannelId) return;
  const logChannel = newState.guild.channels.cache.get(voiceLogChannelId);
  if (!logChannel) return;

  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🔊 Voice Join")
      .setDescription(`**${newState.member.user.tag}** joined **${newState.channel.name}**`)
      .setFooter({ text: `User ID: ${newState.member.user.id}` })
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }

  else if (oldState.channelId && !newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🔇 Voice Leave")
      .setDescription(`**${oldState.member.user.tag}** left **${oldState.channel.name}**`)
      .setFooter({ text: `User ID: ${oldState.member.user.id}` })
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }

  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("➡️ Voice Switch")
      .setDescription(`**${newState.member.user.tag}** moved from **${oldState.channel.name}** → **${newState.channel.name}**`)
      .setFooter({ text: `User ID: ${newState.member.user.id}` })
      .setTimestamp();
    return logChannel.send({ embeds: [embed] });
  }
});

// ===== Welcome Messages =====
client.on(Events.GuildMemberAdd, member => {
  if (!welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎉 Welcome to REDEMPTION!")
    .setDescription(
      `Hey ${member}, welcome to **REDEMPTION**! 🎊\n\n` +
      "━━━━▣━━◤◢━━▣━━━━━\n" +
      "📜 Make Sure To Read **RP Rules**\n" +
      "📢 Check Out **Server Updates**\n" +
      "━━━━▣━━◤◢━━▣━━━━━"
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `User ID: ${member.id}` })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

// ===== Goodbye Messages =====
client.on(Events.GuildMemberRemove, member => {
  if (!goodbyeChannelId) return;
  const channel = member.guild.channels.cache.get(goodbyeChannelId);
  if (!channel) return;

  const goodbyeEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`😭 ${member.user.username} just left REDEMPTION RP...`)
    .setDescription(
      "We’ll miss your RP vibes\n" +
      "Hope to see you back soon!"
    )
    .setFooter({ text: "REDEMPTION RP • Until We Meet Again 🌌" })
    .setTimestamp();

  channel.send({ embeds: [goodbyeEmbed] });
});

// ===== Sticky Message System =====
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const channelId = message.channel.id;
  if (!stickyMessages.has(channelId)) return;

  const stickyMessageId = stickyMessages.get(channelId);
  const lastMessages = await message.channel.messages.fetch({ limit: 2 });
  const lastMessage = lastMessages.last();

  if (lastMessage && lastMessage.id !== stickyMessageId) {
    try {
      const oldSticky = await message.channel.messages.fetch(stickyMessageId);
      await oldSticky.delete();
      
      const sendOptions = {};
      if (oldSticky.content) {
        sendOptions.content = oldSticky.content;
      }
      if (oldSticky.embeds.length > 0) {
        sendOptions.embeds = oldSticky.embeds;
      }

      const newSticky = await message.channel.send(sendOptions);
      stickyMessages.set(channelId, newSticky.id);
    } catch (err) {
      console.error('Failed to update sticky message:', err);
    }
  }
});

// ===== Keep Alive =====
express().get('/', (_, res) => res.send('Bot is online')).listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

client.login(TOKEN);
