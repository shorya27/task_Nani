import Web3, { Wallet } from 'web3';

// Set up Web3 provider (Ankr Ethereum Sepolia RPC endpoint)
const web3 = new Web3('https://rpc.ankr.com/eth_sepolia/8e3900a31a7e3d02ddab7e627e4d6456f34a78f91b3cf3c0d052324b1c2553aa');

// Define the transaction hash
const txHash = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7e7969f3450dbf8f479e6a509';

// Fetch and log the transaction details
async function getTransactionDetails() {
  try {
    const transaction = await web3.eth.getTransaction(txHash);
    console.log('Transaction Details:', transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
  }
}

getTransactionDetails();
