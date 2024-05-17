// Importation des modules nécessaires
const express = require('express');
const mongoose = require('mongoose');
const { NFC } = require('nfc-pcsc');

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/rfid');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erreur de connexion :'));
db.once('open', () => {
  console.log('Connecté à MongoDB');
});

// Schéma pour les badges RFID
const rfidSchema = new mongoose.Schema({
  rfid: { type: String, required: true, unique: true },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  timestamp: { type: Date, default: Date.now }
});

// Schéma pour les utilisateurs
const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  acces: { type: String, required: true }
});

// Schéma pour les logs de passage
const logSchema = new mongoose.Schema({
  rfid: { type: String, required: true },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  accesAutorise: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Modèles pour les collections
const Rfid = mongoose.model('Rfid', rfidSchema);
const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);
const Log = mongoose.model('Log', logSchema);

// Initialiser NFC
const nfc = new NFC();

nfc.on('reader', reader => {
    console.log(`${reader.reader.name} détecté`);

    reader.on('card', async card => {
        console.log(`Carte détectée :`, card);
        const rfid = card.uid;
        console.log(`UID : ${rfid}`);

        try {
            const rfidEntry = await Rfid.findOne({ rfid }).populate('utilisateur').exec();
            if (!rfidEntry) {
                console.log('RFID non trouvé');
                return;
            }

            const utilisateur = rfidEntry.utilisateur;
            let accesAutorise = false;

            // Logique de vérification d'accès
            if (utilisateur.acces === 'admin' || utilisateur.acces === 'employe') {
                accesAutorise = true;
            }

            // Enregistrement du log
            const logEntry = new Log({
                rfid,
                utilisateur: utilisateur._id,
                accesAutorise
            });
            await logEntry.save();

            if (accesAutorise) {
                console.log('Accès autorisé');
                // Code pour ouvrir la porte
            } else {
                console.log('Accès refusé');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'accès :', error);
        }
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
