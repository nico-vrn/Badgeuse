// Importation des modules nécessaires
const express = require('express');
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

nfc.on('reader', reader => {
  console.log(`${reader.reader.name} détecté`);

  reader.on('card', card => {
    console.log(`Carte détectée :`, card);
    const rfid = card.uid;
    console.log(`UID : ${rfid}`);

    db.get(`SELECT * FROM rfid WHERE rfid = ?`, [rfid], (err, rfidEntry) => {
      if (err) {
        return console.error('Erreur lors de la vérification de l\'accès :', err.message);
      }

      if (rfidEntry) {
        console.log('RFID déjà présent dans la base de données');
      } else {
        // Demander les informations à l'utilisateur
        rl.question('Nom de l\'utilisateur : ', (nom) => {
          rl.question('Email de l\'utilisateur : ', (email) => {
            rl.question('Accès de l\'utilisateur (admin/employe/visiteur) : ', (acces) => {
              // Insérer l'utilisateur dans la base de données
              db.run("INSERT INTO utilisateur (nom, email, acces) VALUES (?, ?, ?)", [nom, email, acces], function(err) {
                if (err) {
                  return console.error(err.message);
                }
                const userId = this.lastID;

                // Insérer le RFID dans la base de données
                db.run("INSERT INTO rfid (rfid, utilisateur_id) VALUES (?, ?)", [rfid, userId], function(err) {
                  if (err) {
                    return console.error(err.message);
                  }
                  console.log(`Un nouvel enregistrement a été ajouté à la table rfid avec l'UID ${rfid}`);
                  //close process
                    rl.close();
                });
              });
            });
          });
        });
      }
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

// Démarrer le serveur Express (si nécessaire)
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
