const sqlite3 = require('sqlite3').verbose();
const { NFC } = require('nfc-pcsc');
const readline = require('readline');

// Connexion à SQLite
const db = new sqlite3.Database('./rfid.db', (err) => {
  if (err) {
    console.error('Erreur de connexion :', err.message);
  } else {
    console.log('Connecté à SQLite');
  }
});

// Initialiser NFC
const nfc = new NFC();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let currentRfid = null;

nfc.on('reader', reader => {
  console.log(`${reader.reader.name} détecté`);

  reader.on('card', card => {
    console.log(`Carte détectée :`, card);
    currentRfid = card.uid;
    console.log(`UID : ${currentRfid}`);

    rl.question('Email de l\'utilisateur : ', (email) => {
      db.get(`SELECT * FROM utilisateur WHERE email = ?`, [email], (err, user) => {
        if (err) {
          console.error('Erreur lors de la recherche de l\'utilisateur :', err.message);
          rl.close();
          return;
        }

        if (!user) {
          console.log('Utilisateur non trouvé');
          rl.close();
          return;
        }

        // Insérer une nouvelle entrée dans la table rfid
        db.run(`INSERT INTO rfid (rfid, utilisateur_id, status) VALUES (?, ?, ?)`, [currentRfid, user.id, 'autorisé'], function(err) {
          if (err) {
            console.error('Erreur lors de la création de la nouvelle carte NFC :', err.message);
          } else {
            console.log(`Nouvelle carte NFC créée pour l'utilisateur ${user.nom}`);
          }
          rl.close();
        });
      });
    });
  });

  reader.on('card.off', card => {
    console.log(`Carte retirée :`, card);
  });

  reader.on('error', err => {
    console.error(`Erreur du lecteur ${reader.reader.name} :`, err);
  });

  reader.on('end', () => {
    console.log(`${reader.reader.name} déconnecté`);
  });

  console.log(`Prêt pour détecter les cartes...`);
});

nfc.on('error', err => {
  console.error('Erreur NFC :', err);
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
