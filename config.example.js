// Copy this file to config.js and fill in local/deployment values.
// config.js is ignored by Git so API keys and deployment-specific addresses
// do not get committed.

window.SecureMsgConfig = {
  sepoliaChainIdDecimal: 11155111,
  sepoliaChainIdHex: "0xaa36a7",

  // Optional. Leave null to use MetaMask/window.ethereum for reads.
  sepoliaReadRpcUrl: null,

  // Required for production verification.
  // Proof packages must use this exact deployed MessageIntegrity address.
  expectedContractAddress: null,

  // Optional. Add extra accepted deployments only if you intentionally support
  // more than one trusted MessageIntegrity contract.
  allowedContractAddresses: []
};
