const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Supprimer la base de données existante
const dbFile = './rfid.db';
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Base de données existante supprimée.');
}

// Recréer la base de données
const db = new sqlite3.Database(dbFile, (err) => {
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
      `, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table utilisateur :', err.message);
        } else {
          console.log('Table utilisateur créée ou déjà existante');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS rfid (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rfid TEXT NOT NULL UNIQUE,
          utilisateur_id INTEGER,
          status TEXT NOT NULL DEFAULT 'autorisé',  -- Nouveau champ pour le statut
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(utilisateur_id) REFERENCES utilisateur(id)
        )
      `, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table rfid :', err.message);
        } else {
          console.log('Table rfid créée ou déjà existante');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rfid TEXT NOT NULL,
          utilisateur_id INTEGER,
          accesAutorise BOOLEAN NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(utilisateur_id) REFERENCES utilisateur(id)
        )
      `, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table log :', err.message);
        } else {
          console.log('Table log créée ou déjà existante');
        }
      });
    });
  }
  db.close((err) => {
    if (err) {
      console.error('Erreur lors de la fermeture de la base de données :', err.message);
    } else {
      console.log('Base de données fermée avec succès');
    }
  });
});
