const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../Events/loadDatabase');
const ms = require('ms');
const config = require('../config.json');
const Discord = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, bot, config) {
 
    if (interaction.isCommand()) {
      const cmd = bot.slashCommands.get(interaction.commandName);
      const args = [];
      for (let option of interaction.options.data) {
        if (option.type === 1) {
          if (option.name) args.push(option.name);
          option.options?.forEach((x) => {
            if (x.value) args.push(x.value);
          });
        } else if (option.value) args.push(option.value);
      }
      cmd.run(bot, interaction, args, config);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'confess_open') {
      const modal = new ModalBuilder()
        .setCustomId('confess_modal')
        .setTitle('Faire une confession');

      const input = new TextInputBuilder()
        .setCustomId('confess_text')
        .setLabel('Ta confession')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'confess_modal') {
  const confession = interaction.fields.getTextInputValue('confess_text');
  db.get('SELECT channel FROM Confess WHERE guildId = ?', [interaction.guild.id], async (err, row) => {
    if (err || !row || row.channel === 'off') {
      return interaction.reply({ content: "Le salon de confession n'est pas configuré.", flags: Discord.MessageFlags.Ephemeral });
    }
    const confessChannel = interaction.guild.channels.cache.get(row.channel);
    if (!confessChannel) {
      return interaction.reply({ content: "Le salon de confession est introuvable.", flags: Discord.MessageFlags.Ephemeral });
    }

    const confessionNumber = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM confesslogs WHERE guildId = ?', [interaction.guild.id], (err2, row2) => {
        if (!err2 && row2) return resolve(row2.count + 1);
        resolve(1);
      });
    });

    db.run('INSERT INTO confesslogs (guildId, userId, message) VALUES (?, ?, ?)', [interaction.guild.id, interaction.user.id, confession]);

    const embed = new EmbedBuilder()
      .setTitle(`Confession #${confessionNumber}`)
      .setDescription(confession)
      .setColor(config.color);

    const messages = await confessChannel.messages.fetch({ limit: 10 });
    const lastBotMsg = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
    if (lastBotMsg) {
      await lastBotMsg.edit({ components: [] }).catch(() => {});
    }

    const rowBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confess_open')
        .setLabel('Se confesser')
        .setStyle(ButtonStyle.Primary)
    );

    await confessChannel.send({ embeds: [embed], components: [rowBtn] });
  });
}

if (interaction.isButton() && interaction.customId.startsWith('giveaway_')) {
  const [ , action, messageId ] = interaction.customId.split('_');
  if (action === 'reroll') {
    await bot.giveawaysManager.reroll(messageId)
      .then(() => interaction.reply({ content: "Reroll", flags: Discord.MessageFlags.Ephemeral }))
      .catch(() => interaction.reply({ content: "Erreur lors du reroll.", flags: Discord.MessageFlags.Ephemeral }));
  }
  if (action === 'end') {
    await bot.giveawaysManager.end(messageId)
      .then(() => interaction.reply({ content: "Giveaway terminé !", flags: Discord.MessageFlags.Ephemeral }))
      .catch(() => interaction.reply({ content: "Erreur lors de la fin du giveaway.", flags: Discord.MessageFlags.Ephemeral }));
  }
}

    if (interaction.isButton() && interaction.customId === 'suggest_open') {
      const modal = new ModalBuilder()
        .setCustomId('suggest_modal')
        .setTitle('Faire une suggestion');

      const input = new TextInputBuilder()
        .setCustomId('suggest_text')
        .setLabel('Ta suggestion')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'suggest_modal') {
      const suggestion = interaction.fields.getTextInputValue('suggest_text');
      db.get('SELECT channel FROM Suggest WHERE guildId = ?', [interaction.guild.id], async (err, row) => {
        if (err || !row || row.channel === 'off') {
          return interaction.reply({ content: "Le salon de suggestion n'est pas configuré.", flags: Discord.MessageFlags.Ephemeral });
        }
        const suggestChannel = interaction.guild.channels.cache.get(row.channel);
        if (!suggestChannel) {
          return interaction.reply({ content: "Le salon de suggestion est introuvable.", flags: Discord.MessageFlags.Ephemeral });
        }

        const messages = await suggestChannel.messages.fetch({ limit: 10 });
        const lastBotMsg = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (lastBotMsg) {
          await lastBotMsg.edit({ components: [] }).catch(() => {});
        }

        const embed = new EmbedBuilder()
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTitle('Suggestion')
          .setDescription(suggestion)
          .setColor(config.color);

        const rowBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('suggest_open')
            .setLabel('Faire une suggestion')
            .setStyle(ButtonStyle.Primary)
        );

        const sentMsg = await suggestChannel.send({ embeds: [embed], components: [rowBtn] });
        await sentMsg.react('✅');
        await sentMsg.react('❌');
      });
    }

    if (interaction.isButton() && interaction.customId === 'ticket_open') {
      const existing = interaction.guild.channels.cache.find(c => c.topic === `Ticket de ${interaction.user.id}`);
      if (existing) {
        return interaction.reply({ content: 'Vous avez déjà un ticket ouvert.', ephemeral: true });
      }
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
          { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] },
        ],
      });
      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );
      await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [
        new EmbedBuilder()
          .setTitle('Ticket Ouvert')
          .setDescription('Expliquez votre problème, un membre du staff va vous répondre.')
          .setColor(config.color)
      ], components: [closeBtn] });
      return interaction.reply({ content: `Votre ticket a été créé: ${ticketChannel}`, ephemeral: true });
    }


    if (interaction.isButton() && interaction.customId.startsWith('ticket_option')) {
      const optionKey = interaction.customId.replace('ticket_', '');
      const optionLabel = config[optionKey] || 'Ticket';
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${optionKey}`)
        .setTitle(`Créer un ticket`);
      const input = new TextInputBuilder()
        .setCustomId('raison')
        .setLabel('Raison')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
      const optionKey = interaction.customId.replace('ticket_modal_', '');
      const optionLabel = config[optionKey] || 'Ticket';
      const raison = interaction.fields.getTextInputValue('raison');
      const existing = interaction.guild.channels.cache.find(c => c.topic === `${optionLabel} - ${interaction.user.username}`);
      if (existing) {
        return interaction.reply({ content: 'Vous avez déjà un ticket ouvert', ephemeral: true });
      }
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        topic: `${optionLabel} - ${interaction.user.username}`,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
          { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] },
        ],
      });
      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Fermer')
          .setStyle(ButtonStyle.Danger)
      );
      await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [
        new EmbedBuilder()
          .setTitle('Ticket - ' + optionLabel)
          .setDescription('Expliquez votre problème, un membre du staff va vous répondre.\n\nPour fermer le ticket, cliquez sur le bouton fermer le ticket')
          .setColor(config.color)
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields({
            name: 'Raison',
            value: `\`\`\`\n${raison}\n\`\`\``,
            inline: false
          })
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()
      ], components: [closeBtn] });
      return interaction.reply({ content: `Votre ticket: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
        await interaction.channel.delete()
    }
  }
};
