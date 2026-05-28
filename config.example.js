// Copy this file to config.js and fill in local/deployment values.
// config.js is ignored by Git. Keep this browser-safe: no private keys.

window.SecureMsgConfig = {
  sepoliaChainIdDecimal: 11155111,
  sepoliaChainIdHex: "0xaa36a7",

  // Optional browser read RPC. Leave null to use MetaMask/window.ethereum.
  // Do not put secret server-only API keys here because browsers expose this file.
  sepoliaReadRpcUrl: null,

  // Required for production verification.
  // Proof packages must use this exact deployed MessageIntegrity address.
  expectedContractAddress: null,

  // Optional. Add extra accepted deployments only if you intentionally support
  // more than one trusted MessageIntegrity contract.
  allowedContractAddresses: [],

  // Keep this the same for recording and verification clients.
  maxSegmentEnvelopes: 5
};
