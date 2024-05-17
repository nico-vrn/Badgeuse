const { NFC } = require('nfc-pcsc');

const nfc = new NFC();

nfc.on('reader', reader => {
    console.log(`${reader.reader.name} détecté`);

    reader.on('card', card => {
        console.log(`Carte détectée :`, card);
        console.log(`UID : ${card.uid}`);
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
