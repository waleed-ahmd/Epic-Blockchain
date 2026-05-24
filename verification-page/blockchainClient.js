// verification-page/blockchainClient.js

/**
 * SecureMsg Blockchain Client
 *
 * This file connects the browser to the MessageIntegrity smart contract.
 *
 * It is responsible for:
 * 1. Connecting to MetaMask
 * 2. Making sure the user is on Sepolia
 * 3. Recording a conversation segment Merkle root on-chain
 * 4. Reading an existing segment record from the contract
 *
 * It expects ethers.js v6 to be loaded before this file:
 *
 * <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
 * <script src="blockchainClient.js"></script>
 */

(function () {
  "use strict";

  /**
   * Sepolia details.
   */
  const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;
  const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

  /**
   * Minimal ABI for the MessageIntegrity contract.
   *
   * This ABI includes only the functions/events that the verification page needs.
   *
   * It must match the Solidity contract:
   * MessageIntegrity.sol
   */
  const MESSAGE_INTEGRITY_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "segmentRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "conversationRef",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "segmentRef",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "messageCount",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "recorder",
          "type": "address"
        }
      ],
      "name": "SegmentRootRecorded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "segmentRoot",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "conversationRef",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "segmentRef",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "messageCount",
          "type": "uint8"
        }
      ],
      "name": "recordSegmentRoot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "getRecord",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "segmentRoot",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "conversationRef",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "segmentRef",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "messageCount",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "recorder",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRecordCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
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
   */
  async function connectWallet() {
    requireEthers();
    requireEthereumWallet();

    await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return {
      provider,
      signer,
      address
    };
  }

  /**
   * Makes sure MetaMask is on Sepolia.
   *
   * If the user is on another chain, this asks MetaMask to switch.
   */
  async function ensureSepoliaNetwork() {
    requireEthereumWallet();

    const currentChainId = await window.ethereum.request({
      method: "eth_chainId"
    });

    if (currentChainId === SEPOLIA_CHAIN_ID_HEX) {
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
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
      signerAddress: address
    };
  }

  /**
   * Creates a contract instance connected with a provider.
   *
   * Use this when you only want to read from the blockchain.
   */
  async function getReadableContract(contractAddress) {
    validateContractAddress(contractAddress);

    await ensureSepoliaNetwork();

    const { provider } = await connectWallet();

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
   * @param {Object} input
   * @param {string} input.contractAddress - Deployed contract address.
   * @param {string} input.segmentRoot - Merkle root as bytes32 hex string.
   * @param {string} input.conversationRef - Backend conversation reference.
   * @param {string} input.segmentRef - Backend segment reference.
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
      messageCount
    } = input;

    validateContractAddress(contractAddress);
    validateBytes32(segmentRoot, "segmentRoot");
    requireNonEmptyString(conversationRef, "conversationRef");
    requireNonEmptyString(segmentRef, "segmentRef");
    validateMessageCount(messageCount);

    const { contract, signerAddress } = await getWritableContract(contractAddress);

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
      recorder: signerAddress
    };
  }

  /**
   * Reads one segment record from the smart contract.
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
      recorder: result[5]
    };
  }

  /**
   * Reads the total number of records stored in the contract.
   *
   * Useful for testing after deployment.
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
    connectWallet,
    ensureSepoliaNetwork,
    getWritableContract,
    getReadableContract,
    recordSegmentRoot,
    fetchSegmentRecord,
    fetchRecordCount
  };
})();