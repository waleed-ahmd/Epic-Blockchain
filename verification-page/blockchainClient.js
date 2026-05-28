// verification-page/blockchainClient.js

/**
 * SecureMsg Blockchain Client
 *
 * This file connects the browser to the MessageIntegrity smart contract.
 *
 * It is responsible for:
 * 1. Connecting to MetaMask for writing transactions
 * 2. Making sure the user is on Sepolia for recording
 * 3. Recording a client-created conversation segment hash on-chain
 * 4. Reading an existing segment record from the contract
 *
 * Important:
 * - Recording requires MetaMask because it writes to the blockchain.
 * - Reading/verifying does not request MetaMask account access.
 *
 * It expects ethers.js v6 to be loaded before this file:
 *
 * <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
 * <script src="blockchainClient.js"></script>
 */

(function () {
  "use strict";

  const CONFIG = window.SecureMsgConfig || {};

  /**
   * Network and deployment details.
   *
   * Put local/deployment-specific values in ../config.js. That file is ignored
   * by Git; ../config.example.js documents the expected shape.
   */
  const SEPOLIA_CHAIN_ID_DECIMAL =
    CONFIG.sepoliaChainIdDecimal || 11155111;
  const SEPOLIA_CHAIN_ID_HEX = CONFIG.sepoliaChainIdHex || "0xaa36a7";
  const SEPOLIA_READ_RPC_URL = CONFIG.sepoliaReadRpcUrl || null;
  const EXPECTED_CONTRACT_ADDRESS = CONFIG.expectedContractAddress || null;
  const ALLOWED_CONTRACT_ADDRESSES = Array.isArray(CONFIG.allowedContractAddresses)
    ? CONFIG.allowedContractAddresses
    : [];
  /**
   * Minimal ABI for the MessageIntegrity contract.
   *
   * This ABI includes only the functions/events that the recording and
   * verification pages need.
   *
   * It must match the Solidity contract:
   * MessageIntegrity.sol
   */
  const MESSAGE_INTEGRITY_ABI = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "hash",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "recorder",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "timestamp",
          type: "uint64",
        },
      ],
      name: "DigestRecorded",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "hash",
          type: "bytes32",
        },
        {
          internalType: "bytes",
          name: "signature",
          type: "bytes",
        },
      ],
      name: "recordDigest",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "hash",
          type: "bytes32",
        },
      ],
      name: "getRecord",
      outputs: [
        {
          internalType: "address",
          name: "recorder",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "timestamp",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  /**
   * Checks that ethers.js is loaded.
   */
  function requireEthers() {
    if (typeof ethers === "undefined") {
      throw new Error(
        "ethers.js is not loaded. Include ethers before blockchainClient.js."
      );
    }
  }

  /**
   * Checks that MetaMask or another Ethereum wallet is available.
   *
   * Required only for writing transactions.
   */
  function requireEthereumWallet() {
    if (!window.ethereum) {
      throw new Error(
        "No Ethereum wallet found. Please install MetaMask or use a browser with wallet support."
      );
    }
  }

  /**
   * Validates a contract address.
   */
  function validateContractAddress(contractAddress) {
    requireEthers();

    if (!ethers.isAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }
  }

  function normaliseAddress(address) {
    requireEthers();
    return ethers.getAddress(address).toLowerCase();
  }

  function getAllowedContractAddresses() {
    const addresses = [];

    if (EXPECTED_CONTRACT_ADDRESS) {
      addresses.push(EXPECTED_CONTRACT_ADDRESS);
    }

    addresses.push(...ALLOWED_CONTRACT_ADDRESSES);

    return addresses.filter(Boolean);
  }

  function validateConfiguredContractAddress(contractAddress) {
    validateContractAddress(contractAddress);

    const allowedAddresses = getAllowedContractAddresses();

    if (allowedAddresses.length === 0) {
      throw new Error(
        "Trusted contract address is not configured. Set expectedContractAddress in config.js."
      );
    }

    const normalisedContractAddress = normaliseAddress(contractAddress);
    const allowed = allowedAddresses.map(normaliseAddress);

    if (!allowed.includes(normalisedContractAddress)) {
      throw new Error("Proof package uses an unapproved contract address.");
    }
  }

  /**
   * Validates a bytes32 hash.
   */
  function validateBytes32(value, fieldName) {
    requireEthers();

    if (!ethers.isHexString(value, 32)) {
      throw new Error(`${fieldName} must be a 32-byte hex string`);
    }
  }

  /**
   * Requests wallet connection.
   *
   * This opens MetaMask and asks the user to connect their wallet.
   *
   * Use this only for writing/recording segment hashes.
   */
  async function connectWallet() {
    requireEthers();
    requireEthereumWallet();

    await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return {
      provider,
      signer,
      address,
    };
  }

  /**
   * Makes sure MetaMask is on Sepolia.
   *
   * If the user is on another chain, this asks MetaMask to switch.
   *
   * Used for recording/writing transactions.
   */
  async function ensureSepoliaNetwork() {
    requireEthereumWallet();

    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (currentChainId === SEPOLIA_CHAIN_ID_HEX) {
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } catch (error) {
      throw new Error(
        "Please switch MetaMask to the Sepolia test network before continuing."
      );
    }
  }

  /**
   * Creates a contract instance connected with a signer.
   *
   * Use this when you want to write to the blockchain.
   */
  async function getWritableContract(contractAddress) {
    validateContractAddress(contractAddress);

    await ensureSepoliaNetwork();

    const { signer, address } = await connectWallet();

    const contract = new ethers.Contract(
      contractAddress,
      MESSAGE_INTEGRITY_ABI,
      signer
    );

    return {
      contract,
      signer,
      signerAddress: address,
    };
  }

  /**
   * Creates a read-only provider.
   *
   * This does NOT request MetaMask account access.
   *
   * Reading works in two ways:
   * 1. If SEPOLIA_READ_RPC_URL is set, use it.
   * 2. Otherwise, use window.ethereum as a read-only browser provider.
   *
   * Note:
   * If using window.ethereum, MetaMask must still be installed,
   * but the user will not be asked to connect an account.
   */
  function getReadOnlyProvider() {
    requireEthers();

    if (SEPOLIA_READ_RPC_URL) {
      return new ethers.JsonRpcProvider(
        SEPOLIA_READ_RPC_URL,
        SEPOLIA_CHAIN_ID_DECIMAL
      );
    }

    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }

    throw new Error(
      "No read provider available. Install MetaMask or configure SEPOLIA_READ_RPC_URL."
    );
  }

  /**
   * Creates a contract instance connected with a read-only provider.
   *
   * Use this when you only want to read from the blockchain.
   *
   * This does not call eth_requestAccounts and does not force the user
   * to connect their wallet.
   */
  async function getReadableContract(contractAddress) {
    validateContractAddress(contractAddress);

    const provider = getReadOnlyProvider();

    const contract = new ethers.Contract(
      contractAddress,
      MESSAGE_INTEGRITY_ABI,
      provider
    );

    return contract;
  }

  /**
   * Records a signed segment hash on the MessageIntegrity smart contract.
   *
   * This is called by the client after it creates a local conversation segment.
   *
   * @param {Object} input
   * @param {string} input.contractAddress - Deployed contract address.
   * @param {string} input.segmentHash - Segment hash as bytes32 hex string.
   *
   * @returns {Object} Blockchain proof object.
   */
  async function recordSegmentHash(input) {
    if (!input || typeof input !== "object") {
      throw new Error("recordSegmentHash input object is required");
    }

    const { contractAddress, segmentHash } = input;

    validateContractAddress(contractAddress);
    validateBytes32(segmentHash, "segmentHash");

    const { contract, signer, signerAddress } = await getWritableContract(
      contractAddress
    );

    const signature = await signer.signMessage(ethers.getBytes(segmentHash));
    const transaction = await contract.recordDigest(segmentHash, signature);

    await transaction.wait(1);
    const [recorder, timestamp] = await contract.getRecord(segmentHash);

    return {
      segment_hash: segmentHash,
      transaction_hash: transaction.hash,
      contract_address: contractAddress,
      chain_name: "sepolia",
      chain_id: SEPOLIA_CHAIN_ID_DECIMAL,
      recorded_timestamp: Number(timestamp),
      recorder: recorder || signerAddress,
    };
  }

  /**
   * Reads one segment record from the smart contract.
   *
   * This is used during verification.
   *
   * It does not request MetaMask account access.
   *
   * @param {string} contractAddress - Deployed contract address.
   * @param {string} segmentHash - Segment hash to look up.
   *
   * @returns {Object} On-chain segment record.
   */
  async function fetchSegmentRecord(contractAddress, segmentHash) {
    validateContractAddress(contractAddress);
    validateBytes32(segmentHash, "segmentHash");

    const contract = await getReadableContract(contractAddress);

    const result = await contract.getRecord(segmentHash);
    const timestamp = Number(result[1]);

    return {
      segment_hash: segmentHash,
      recorder: result[0],
      timestamp,
      recorded: timestamp !== 0,
    };
  }

  /**
   * Expose functions globally for browser usage.
   */
  window.SecureMsgBlockchain = {
    SEPOLIA_CHAIN_ID_DECIMAL,
    SEPOLIA_CHAIN_ID_HEX,
    MESSAGE_INTEGRITY_ABI,
    EXPECTED_CONTRACT_ADDRESS,
    ALLOWED_CONTRACT_ADDRESSES,
    connectWallet,
    ensureSepoliaNetwork,
    getWritableContract,
    getReadableContract,
    getReadOnlyProvider,
    validateConfiguredContractAddress,
    recordSegmentHash,
    fetchSegmentRecord,
  };
})();
