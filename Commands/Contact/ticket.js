const Discord = require('discord.js');
const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuOptionBuilder, ButtonStyle } = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'ticket',
  sname: 'ticket',
  description : 'Permet de configurer les tickets',
  use: 'ticket',
};

exports.run = async (bot, message, args, config) => {
  const checkperm = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
    }

const public = await new Promise((resolve, reject) => {
  db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'], (err, row) => {
    if (err) reject(err);
    resolve(!!row);
  });
});

if (public) {

  const publiccheck = await new Promise((resolve, reject) => {
    db.get(
      'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
      ['public', commandName, message.guild.id],
      (err, row) => {
        if (err) reject(err);
        resolve(!!row);
      }
    );
  });

  if (publiccheck) {
    return true;
  }
}
    
    try {
      const userwl = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userwl) {
        return true;
      }

            const userowner = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userowner) {
        return true;
      }

      const userRoles = message.member.roles.cache.map(role => role.id);

      const permissions = await new Promise((resolve, reject) => {
        db.all('SELECT perm FROM permissions WHERE id IN (' + userRoles.map(() => '?').join(',') + ') AND guild = ?', [...userRoles, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.perm));
        });
      });

      if (permissions.length === 0) {
        return false;
      }

      const cmdwl = await new Promise((resolve, reject) => {
        db.all('SELECT command FROM cmdperm WHERE perm IN (' + permissions.map(() => '?').join(',') + ') AND guild = ?', [...permissions, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.command));
        });
      });

      return cmdwl.includes(commandName);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  if (!(await checkperm(message, exports.help.name))) {
    return message.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", allowedMentions: { repliedUser: false } });
  }

  const options = [
    { key: 'option1', label: config.option1 },
    { key: 'option2', label: config.option2 },
    { key: 'option3', label: config.option3 },
    { key: 'option4', label: config.option4 }
  ].filter(opt => opt.label && opt.label.trim() !== '');

  if (options.length === 0) {
    return message.reply({ content: 'Aucune option de ticket n\'est configurée' });
  }

  const row = new ActionRowBuilder();
  options.forEach(opt => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_${opt.key}`)
        .setLabel(opt.label)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  const embed = new EmbedBuilder();
  if (config.titre && config.titre.trim() !== '') {
    embed.setTitle(config.titre);
  }
  embed.setDescription(config.description);
  if (config.color) {
    embed.setColor(config.color);
  }
  let icon = message.guild.iconURL({ dynamic: true });
  if (config.tfooter && config.tfooter.trim() !== '') {
    embed.setFooter({ text: config.tfooter, iconURL: icon });
  }

  await message.channel.send({ embeds: [embed], components: [row] });
};
