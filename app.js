// Importation des modules nécessaires
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/rfid', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// connexion à MongoDB
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erreur de connexion :'));
db.once('open', () => {
  console.log('Connecté à MongoDB');
});

// schéma pour les badges RFID
const rfidSchema = new mongoose.Schema({
  rfid: { type: String, required: true, unique: true },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  timestamp: { type: Date, default: Date.now }
});

// schéma pour les utilisateurs
const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true }
});

// modèles pour les collections (tableai de donnee en gros)
const Rfid = mongoose.model('Rfid', rfidSchema);
const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);

// application Express
const app = express();
app.use(bodyParser.json()); // body-parser pour analyser les corps des requêtes en JSON

// Route pour enregistrer un nouvel utilisateur
app.post('/enregistrer', async (req, res) => {
  try {
    const utilisateur = new Utilisateur(req.body); // Créer un nouvel utilisateur avec les données de la requête
    await utilisateur.save(); // Sauvegarder l'utilisateur dans la base de données
    res.status(201).send(utilisateur); // Répondre avec l'utilisateur créé
  } catch (error) {
    res.status(400).send(error); // Répondre avec une erreur si quelque chose ne va pas
  }
});

// Route pour enregistrer une lecture RFID
app.post('/scanner', async (req, res) => {
  try {
    const { rfid, utilisateurId } = req.body; // Obtenir les données de la requête
    const rfidEntry = new Rfid({ rfid, utilisateur: utilisateurId }); // Créer une nouvelle entrée RFID
    await rfidEntry.save(); // Sauvegarder l'entrée dans la base de données
    res.status(201).send(rfidEntry); // Répondre avec l'entrée RFID créée
  } catch (error) {
    res.status(400).send(error); // Répondre avec une erreur si quelque chose ne va pas
  }
});

// Route pour obtenir toutes les lectures RFID
app.get('/scans', async (req, res) => {
  try {
    const scans = await Rfid.find().populate('utilisateur').exec(); // Récupérer toutes les entrées RFID et leurs utilisateurs associés
    res.status(200).send(scans); // Répondre avec les entrées récupérées
  } catch (error) {
    res.status(500).send(error); // Répondre avec une erreur si quelque chose ne va pas
  }
});

// Configurer le port série pour le lecteur RFID
const port = new SerialPort('/dev/tty.usbserial', { baudRate: 9600 });
const parser = port.pipe(new Readline({ delimiter: '\r\n' }));

// Écouter les données du lecteur RFID
parser.on('data', async (data) => {
  console.log(`Données RFID : ${data}`); // Afficher les données RFID dans la console
  try {
    const rfidEntry = new Rfid({ rfid: data, utilisateur: null }); // Créer une nouvelle entrée RFID sans utilisateur
    await rfidEntry.save(); // Sauvegarder l'entrée dans la base de données
    console.log('Entrée RFID enregistrée'); // Afficher un message de succès
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'entrée RFID :', error); // Afficher un message d'erreur
  }
});

// Démarrer le serveur sur le port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
