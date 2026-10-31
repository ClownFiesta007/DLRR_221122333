const { ethers } = require("ethers");
require("dotenv").config();

let provider = null;
let wallet = null;

function getProvider() {
  if (!provider) {
    const url = process.env.RPC_URL || "https://mainnet.base.org";
    provider = new ethers.JsonRpcProvider(url);
  }
  return provider;
}

function getWallet() {
  if (!wallet) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY missing in server/.env");
    wallet = new ethers.Wallet(pk, getProvider());
  }
  return wallet;
}

module.exports = { getProvider, getWallet };
