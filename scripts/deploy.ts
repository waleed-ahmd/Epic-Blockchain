import "dotenv/config";
import { network } from "hardhat";
import { MessageIntegrity__factory } from "../typechain-types/index.js";

async function main(): Promise<void> {
  const { WALLET_PRIVATE_KEY } = process.env;
  if (!WALLET_PRIVATE_KEY) throw new Error("WALLET_PRIVATE_KEY is not set in .env");

  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();
  const contract = await new MessageIntegrity__factory(signer).deploy();
  await contract.waitForDeployment();
  console.log("MessageIntegrity deployed to:", await contract.getAddress());
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
