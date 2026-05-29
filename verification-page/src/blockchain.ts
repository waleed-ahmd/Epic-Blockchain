import { ethers } from "ethers";
import type { OnChainRecord } from "./types";

const SEPOLIA_CHAIN_ID = 11155111;
export const DEFAULT_SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const MESSAGE_INTEGRITY_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "getRecord",
    outputs: [
      { internalType: "address", name: "recorder", type: "address" },
      { internalType: "uint64", name: "timestamp", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

function normaliseRpcUrl(rpcUrl: string): string {
  const candidate = rpcUrl.trim() || DEFAULT_SEPOLIA_RPC_URL;
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("RPC URL is invalid");
  }

  if (parsed.protocol !== "https:" ) {
    throw new Error("RPC URL must use https");
  }

  return parsed.toString();
}

export async function fetchSegmentRecord(
  rpcUrl: string,
  contractAddress: string,
  segmentHash: string,
): Promise<OnChainRecord> {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error("Contract address is invalid");
  }

  if (!ethers.isHexString(segmentHash, 32)) {
    throw new Error("Segment hash must be a bytes32 hex string");
  }

  const provider = new ethers.JsonRpcProvider(normaliseRpcUrl(rpcUrl));
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error(`RPC must point to Sepolia chain ID ${SEPOLIA_CHAIN_ID}`);
  }

  const contract = new ethers.Contract(contractAddress, MESSAGE_INTEGRITY_ABI, provider);
  const [recorder, timestamp] = await contract.getRecord(segmentHash);
  const numericTimestamp = Number(timestamp);

  return {
    segment_hash: segmentHash,
    recorder,
    timestamp: numericTimestamp,
    recorded: numericTimestamp !== 0,
  };
}
