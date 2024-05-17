const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

// Connexion à SQLite
const db = new sqlite3.Database('./rfid.db', (err) => {
  if (err) {
    console.error('Erreur de connexion :', err.message);
  } else {
    console.log('Connecté à SQLite');
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('UID de la carte NFC : ', (rfid) => {
  rl.question('Nouveau statut de la carte (révoqué/perdu/autorisé) : ', (newStatus) => {
    db.run(`UPDATE rfid SET status = ? WHERE rfid = ?`, [newStatus, rfid], function(err) {
      if (err) {
        console.error('Erreur lors de la mise à jour du statut de la carte :', err.message);
      } else {
        if (this.changes > 0) {
          console.log(`Statut de la carte NFC mis à jour en ${newStatus}`);
        } else {
          console.log('Carte NFC non trouvée');
        }
      }
      rl.close();
    });
  });
});

rl.on('close', () => {
  db.close((err) => {
    if (err) {
      console.error('Erreur lors de la fermeture de la base de données :', err.message);
    } else {
      console.log('Base de données fermée avec succès');
    }
  });
});
