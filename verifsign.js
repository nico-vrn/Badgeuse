const express = require('express');
const sqlite3 = require('sqlite3').verbose();
    const { NFC } = require('nfc-pcsc');
const crypto = require('crypto');
const fs = require('fs');

// Connexion à SQLite
const db = new sqlite3.Database('./rfid.db', (err) => {
  if (err) {
    console.error('Erreur de connexion :', err.message);
  } else {
    console.log('Connecté à SQLite');
  }
});

// Charger la clé publique
const publicKey = fs.readFileSync('public_key.pem', 'utf8');

function verifySignature(data, signature) {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}

// Initialiser NFC
const nfc = new NFC();

nfc.on('reader', reader => {
  console.log(`${reader.reader.name} détecté`);

  reader.on('card', card => {
    console.log(`Carte détectée :`, card);
    const rfid = card.uid;
    console.log(`UID : ${rfid}`);

    // Ici, on suppose que la signature est également lue depuis la carte ou une base de données
    // Par exemple, pour simplifier, supposons que la signature est stockée dans la table rfid
    db.get(`SELECT * FROM rfid WHERE rfid = ?`, [rfid], (err, rfidEntry) => {
      if (err) {
        return console.error('Erreur lors de la vérification de l\'accès :', err.message);
      }

      if (!rfidEntry) {
        console.log('RFID non trouvé');
        return;
      }

      const signature = rfidEntry.signature;

      if (!verifySignature(rfid, signature)) {
        console.log('Signature non valide, accès refusé');
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
