const Discord = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');
const sendLog = require('../../Events/sendlog');

exports.help = {
  name: 'ban',
  sname: 'ban <mention/id> <raison>',
  description: "Permet de bannir un membre.",
  use: 'ban <mention/id> <raison>',
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

  const user = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
  if (!user) {
    return message.reply("L'utilisateur n'existe pas.");
  }

  const reason = args.slice(1).join(' ');
  if (!reason) {
    return message.reply("Veuillez fournir une raison.");
  }

  try {
    await user.ban({ reason });
    message.reply(`<@${user.id}> a été banni pour ${reason}`);

        const embed = new Discord.EmbedBuilder()
      .setColor(config.color)
      .setDescription(`<@${message.author.id}> a banni <@${user.id}> (${user.id}) pour ${reason}`)
      .setTimestamp();

    sendLog(message.guild, embed, 'modlog');
  } catch (error) {
    console.error('Erreur lors du bannissement :', error);
    return message.reply("Une erreur est survenue.");
  }
  
  db.run(`INSERT INTO sanctions (userId, raison, date, guild) VALUES (?, ?, ?, ?)`, [user.id, reason + ' - Ban', new Date().toISOString(), message.guild.id], function(err) {
    if (err) {
      console.error('Erreur lors de l\'ajout de la sanction :', err);
      return message.reply("Une erreur est survenue.");
    }
  });
};