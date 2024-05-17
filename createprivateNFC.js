const crypto = require('crypto');
const fs = require('fs');

const privateKey = fs.readFileSync('private_key.pem', 'utf8');

function signData(data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');
  return signature;
}

// Exemple d'utilisation pour signer un UID de carte NFC
const cardUid = '1234567890ABCDEF';
const signature = signData(cardUid);

console.log('UID:', cardUid);
console.log('Signature:', signature);
