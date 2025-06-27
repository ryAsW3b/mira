const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'antibot',
  description: "Active/désactive l'antibot",
  use: 'antibot on/off',
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

  const guildId = message.guild.id;
  const status = args[0].toLowerCase() === 'on' ? 1 : 0;

  db.run(`INSERT INTO antiraid (guild, antibot)
          VALUES (?, ?)
          ON CONFLICT(guild) DO UPDATE SET antibot = ?`,
    [guildId, status, status], (err) => {
      if (err) return message.reply('Erreur lors de la mise à jour des paramètres.');
      const response = status ?
        "L'antibot a bien été activé." :
        "L'antibot a bien été désactivé.";
      message.reply(response);
    });
};