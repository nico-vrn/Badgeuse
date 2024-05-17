// Importation des modules nécessaires
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { NFC } = require('nfc-pcsc');

// Connexion à SQLite
const db = new sqlite3.Database('./rfid.db', (err) => {
  if (err) {
    console.error('Erreur de connexion :', err.message);
  } else {
    console.log('Connecté à SQLite');
    db.serialize(() => {
      // Création des tables si elles n'existent pas
      db.run(`
        CREATE TABLE IF NOT EXISTS utilisateur (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          acces TEXT NOT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS rfid (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rfid TEXT NOT NULL UNIQUE,
          utilisateur_id INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(utilisateur_id) REFERENCES utilisateur(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rfid TEXT NOT NULL,
          utilisateur_id INTEGER,
          accesAutorise BOOLEAN NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(utilisateur_id) REFERENCES utilisateur(id)
        )
      `);
    });
  }
});

// Initialiser NFC
const nfc = new NFC();

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

            if (!rfidEntry) {
                console.log('RFID non trouvé');
                return;
            }

            db.get(`SELECT * FROM utilisateur WHERE id = ?`, [rfidEntry.utilisateur_id], (err, utilisateur) => {
                if (err) {
                    return console.error('Erreur lors de la vérification de l\'accès :', err.message);
                }

                let accesAutorise = false;

                // Logique de vérification d'accès
                if (utilisateur.acces === 'admin' || utilisateur.acces === 'employe') {
                    accesAutorise = true;
                }

                // Enregistrement du log
                db.run(`INSERT INTO log (rfid, utilisateur_id, accesAutorise) VALUES (?, ?, ?)`, [rfid, utilisateur.id, accesAutorise], (err) => {
                    if (err) {
                        return console.error('Erreur lors de l\'enregistrement du log :', err.message);
                    }

                    if (accesAutorise) {
                        console.log('Accès autorisé');
                        // Code pour ouvrir la porte
                    } else {
                        console.log('Accès refusé');
                    }
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

// Démarrer le serveur Express (si nécessaire)
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
