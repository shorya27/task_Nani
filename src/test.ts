const Web3 = require("web3");
const web3 = new Web3();

// Example private key (replace with your own private key)
const privateKey = "6c3a30b87b71dd2f5338ca08bea6e49363134c824e51272d20f2c9cb76b80a9c";

// Use the `privateKeyToAccount` method
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

// Derive the public key
console.log("Public Key:", account.signingKey.getPublicKey().toString('hex'));

// Derive the Ethereum address (derived from the public key)
console.log("Address:", account.address);