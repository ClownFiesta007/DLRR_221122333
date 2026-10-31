const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const DEFAULTS = {
  drainerAddress: process.env.DRAINER_ADDRESS || "",
  tokens: [
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, name: "USD Coin" },
    { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18, name: "Dai Stablecoin" },
    { symbol: "WETH", address: "0x420000000000000000000000000000000000000006", decimals: 18, name: "Wrapped Ether" },
  ],
  victims: [],
  logs: [],
  profit: [],
};

function load() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      return { ...DEFAULTS, ...raw };
    }
  } catch (e) {
    console.error("state load error:", e.message);
  }
  return { ...DEFAULTS };
}

function save(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = { load, save, STATE_FILE };
