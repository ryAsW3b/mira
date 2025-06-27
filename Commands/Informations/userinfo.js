const { EmbedBuilder } = require('discord.js');
const db = require('../../Events/loadDatabase'); 
const config = require('../../config.json');

exports.help = {
    name: 'userinfo',
    description: "Permet d'afficher des informations sur un utilisateur",
    use: 'userinfo [mention/id]',
};

exports.run = async (bot, message, args) => {
    
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

    const user = message.mentions.users.first() || (args[0] ? await bot.users.fetch(args[0]).catch(() => null) : message.author);

    if (!user) {
        return message.reply({ content: "L'utilisateur n'existe pas ou n'est pas sur le serveur.", allowedMentions: { repliedUser: false } });
    }

    const member = await message.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
        .setTitle(`Information - ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setColor(config.color)
        .addFields(
            { name: 'Nom', value: user.tag, inline: true },
            { name: 'Surnom', value: member.nickname || 'Aucun', inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: 'Compte créé le', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
            { name: 'Sur le serveur depuis', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
            { name: 'Rôles', value: member.roles.cache.map(role => role.name).join(', ') || 'Aucun', inline: false },
        )
        .setFooter({ text: '4Protect V2' });

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
};
