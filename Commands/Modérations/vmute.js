const Discord = require('discord.js');
const db = require('../../Events/loadDatabase');
const ms = require('ms'); 
const sendLog = require('../../Events/sendlog');

exports.help = {
  name: 'vmute',
  sname: 'vmute <mention/id> <durée> <raison>',
  description: "Permet de mute une personne en vocal.",
  use: 'vmute <mention/id> <1m/1h/1d> <raison>',
};

exports.run = async (bot, message, args, config) => {
  const checkperm = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
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

  const user = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
  if (!user) {
    return message.reply("L'utilisateur n'existe pas.");
  }

  const duration = args[1];
  if (!duration || !ms(duration)) {
    return message.reply("Format: 1m, 1h, 1d");
  }

  const reason = args.slice(2).join(' ');
  if (!reason) {
    return message.reply("Veuillez fournir une raison.");
  }

  if (!user.voice.channel) {
    return message.reply("L'utilisateur n'est pas dans une vocal.");
  }

  try {
    await user.voice.setMute(true, reason);
    message.reply(`<@${user.id}> a été mute vocal  ${ms(ms(duration), { long: true })} pour ${reason}`);
            const embed = new Discord.EmbedBuilder()
          .setColor(config.color)
          .setDescription(`<@${message.author.id}> a mute <@${user.id}> (${user.id}) pendant ${ms(ms(duration), { long: true })} pour ${reason}`)
          .setTimestamp();
    
        sendLog(message.guild, embed, 'voicelog');
    setTimeout(async () => {
      try {
        await user.voice.setMute(false, "UnVmute");
        console.log(`${user.user.tag} a été unmute après ${duration}.`);
      } catch (error) {
        console.error(`Erreur lors du unmute de ${user.user.tag} :`, error);
      }
    }, ms(duration));
  } catch (error) {
    console.error('Erreur lors du mute vocal :', error);
    return message.reply("Une erreur est survenue.");
  }

  db.run(`INSERT INTO sanctions (userId, raison, date, guild) VALUES (?, ?, ?, ?)`, [user.id, `${reason} - Mute vocal (${duration})`, new Date().toISOString(), message.guild.id], function(err) {
    if (err) {
      console.error('Erreur lors de l\'ajout de la sanction :', err);
      return message.reply("Une erreur est survenue.");
    }
  });
};