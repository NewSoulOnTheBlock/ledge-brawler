// The contracts of Five Blades on Robinhood Chain (README.md): an Arbitrum Orbit chain whose gas is ETH
// (https://docs.robinhood.com/chain/connecting). Its public RPCs are rate-limited: set ROBINHOOD_RPC_URL (and
// ROBINHOOD_TESTNET_RPC_URL) to a provider's, such as Alchemy's, to deploy. Keys and API keys are configuration
// variables (`npx hardhat keystore set DEPLOYER_PRIVATE_KEY`), never written here.
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export const ROBINHOOD = { id: 4663, rpc: "https://rpc.mainnet.chain.robinhood.com" };
export const ROBINHOOD_TESTNET = { id: 46630, rpc: "https://rpc.testnet.chain.robinhood.com" };

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    // Arbitrum Nitro runs Cancun's opcodes; nothing newer is asked of it.
    settings: { evmVersion: "cancun", optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    robinhood: {
      type: "http", chainType: "generic", chainId: ROBINHOOD.id,
      url: process.env.ROBINHOOD_RPC_URL ?? ROBINHOOD.rpc,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    robinhoodTestnet: {
      type: "http", chainType: "generic", chainId: ROBINHOOD_TESTNET.id,
      url: process.env.ROBINHOOD_TESTNET_RPC_URL ?? ROBINHOOD_TESTNET.rpc,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  // Where a deployed contract's source is verified: Blockscout on both, and Etherscan on the mainnet
  // (its V2 API takes Robinhood Chain by its id).
  chainDescriptors: {
    [ROBINHOOD.id]: {
      name: "Robinhood Chain",
      blockExplorers: {
        blockscout: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com", apiUrl: "https://robinhoodchain.blockscout.com/api" },
        etherscan: { name: "Robinhood Etherscan", url: "https://robin.etherscan.io", apiUrl: "https://api.etherscan.io/v2/api" },
      },
    },
    [ROBINHOOD_TESTNET.id]: {
      name: "Robinhood Chain Testnet",
      blockExplorers: {
        blockscout: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com", apiUrl: "https://explorer.testnet.chain.robinhood.com/api" },
      },
    },
  },
  verify: { etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") } },
});
