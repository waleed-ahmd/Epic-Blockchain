// verification-page/blockchainClient.js

/**
 * SecureMsg Blockchain Client
 *
 * This file connects the browser to the MessageIntegrity smart contract.
 *
 * It is responsible for:
 * 1. Connecting to MetaMask for writing transactions
 * 2. Making sure the user is on Sepolia for recording
 * 3. Recording a client-created conversation segment Merkle root on-chain
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
          internalType: "uint256",
          name: "recordId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "segmentRoot",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "string",
          name: "conversationRef",
          type: "string",
        },
        {
          indexed: false,
          internalType: "string",
          name: "segmentRef",
          type: "string",
        },
        {
          indexed: false,
          internalType: "uint8",
          name: "messageCount",
          type: "uint8",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "timestamp",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "recorder",
          type: "address",
        },
      ],
      name: "SegmentRootRecorded",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "segmentRoot",
          type: "bytes32",
        },
        {
          internalType: "string",
          name: "conversationRef",
          type: "string",
        },
        {
          internalType: "string",
          name: "segmentRef",
          type: "string",
        },
        {
          internalType: "uint8",
          name: "messageCount",
          type: "uint8",
        },
      ],
      name: "recordSegmentRoot",
      outputs: [
        {
          internalType: "uint256",
          name: "recordId",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "recordId",
          type: "uint256",
        },
      ],
      name: "getRecord",
      outputs: [
        {
          internalType: "bytes32",
          name: "segmentRoot",
          type: "bytes32",
        },
        {
          internalType: "string",
          name: "conversationRef",
          type: "string",
        },
        {
          internalType: "string",
          name: "segmentRef",
          type: "string",
        },
        {
          internalType: "uint8",
          name: "messageCount",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "timestamp",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "recorder",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRecordCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
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
   * Validates that a value is a non-empty string.
   */
  function requireNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${fieldName} must be a non-empty string`);
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
   * Validates message count.
   *
   * For this project, one segment contains 1 to 5 messages.
   */
  function validateMessageCount(messageCount) {
    if (!Number.isInteger(messageCount)) {
      throw new Error("messageCount must be an integer");
    }

    if (messageCount < 1 || messageCount > 5) {
      throw new Error("messageCount must be between 1 and 5");
    }
  }

  /**
   * Requests wallet connection.
   *
   * This opens MetaMask and asks the user to connect their wallet.
   *
   * Use this only for writing/recording segment roots.
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
   * Extracts the recordId from the SegmentRootRecorded event.
   *
   * The smart contract emits an event after storing the segment root.
   * This function searches the transaction receipt logs and finds that event.
   */
  function extractRecordIdFromReceipt(contract, receipt) {
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);

        if (parsedLog && parsedLog.name === "SegmentRootRecorded") {
          return Number(parsedLog.args.recordId);
        }
      } catch (error) {
        // Ignore logs that do not belong to this contract/interface.
      }
    }

    throw new Error("SegmentRootRecorded event not found in transaction receipt");
  }

  /**
   * Records a segment root on the MessageIntegrity smart contract.
   *
   * This is called by the client after it creates a local conversation segment.
   *
   * @param {Object} input
   * @param {string} input.contractAddress - Deployed contract address.
   * @param {string} input.segmentRoot - Merkle root as bytes32 hex string.
   * @param {string} input.conversationRef - Client-generated conversation reference.
   * @param {string} input.segmentRef - Client-generated segment reference.
   * @param {number} input.messageCount - Number of messages in the segment.
   *
   * @returns {Object} Blockchain proof object.
   */
  async function recordSegmentRoot(input) {
    if (!input || typeof input !== "object") {
      throw new Error("recordSegmentRoot input object is required");
    }

    const {
      contractAddress,
      segmentRoot,
      conversationRef,
      segmentRef,
      messageCount,
    } = input;

    validateContractAddress(contractAddress);
    validateBytes32(segmentRoot, "segmentRoot");
    requireNonEmptyString(conversationRef, "conversationRef");
    requireNonEmptyString(segmentRef, "segmentRef");
    validateMessageCount(messageCount);

    const { contract, signerAddress } = await getWritableContract(
      contractAddress
    );

    const transaction = await contract.recordSegmentRoot(
      segmentRoot,
      conversationRef,
      segmentRef,
      messageCount
    );

    const receipt = await transaction.wait(1);

    const recordId = extractRecordIdFromReceipt(contract, receipt);

    return {
      record_id: recordId,
      segment_root: segmentRoot,
      transaction_hash: transaction.hash,
      contract_address: contractAddress,
      chain_name: "sepolia",
      chain_id: SEPOLIA_CHAIN_ID_DECIMAL,
      conversation_ref: conversationRef,
      segment_ref: segmentRef,
      message_count: messageCount,
      recorder: signerAddress,
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
   * @param {number} recordId - Blockchain record ID.
   *
   * @returns {Object} On-chain segment record.
   */
  async function fetchSegmentRecord(contractAddress, recordId) {
    validateContractAddress(contractAddress);

    if (!Number.isInteger(recordId) || recordId <= 0) {
      throw new Error("recordId must be a positive integer");
    }

    const contract = await getReadableContract(contractAddress);

    const result = await contract.getRecord(recordId);

    return {
      record_id: recordId,
      segment_root: result[0],
      conversation_ref: result[1],
      segment_ref: result[2],
      message_count: Number(result[3]),
      timestamp: Number(result[4]),
      recorder: result[5],
    };
  }

  /**
   * Reads the total number of records stored in the contract.
   *
   * Useful for testing after deployment.
   *
   * This does not request MetaMask account access.
   */
  async function fetchRecordCount(contractAddress) {
    validateContractAddress(contractAddress);

    const contract = await getReadableContract(contractAddress);
    const count = await contract.getRecordCount();

    return Number(count);
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
    recordSegmentRoot,
    fetchSegmentRecord,
    fetchRecordCount,
  };
})();
