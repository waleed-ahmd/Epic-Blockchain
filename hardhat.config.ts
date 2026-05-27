import "dotenv/config";
import { defineConfig } from "hardhat/config";
import HardhatEthers from "@nomicfoundation/hardhat-ethers";
import HardhatTypechain from "@nomicfoundation/hardhat-typechain";
import HardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import HardhatMocha from "@nomicfoundation/hardhat-mocha";

export default defineConfig({
  plugins: [HardhatEthers, HardhatTypechain, HardhatEthersChaiMatchers, HardhatMocha],
  solidity: "0.8.24",
  typechain: {
    outDir: "typechain-types",
  },
  networks: {
    sepolia: {
      type: "http",
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [process.env.WALLET_PRIVATE_KEY!],
    },
  },
});
