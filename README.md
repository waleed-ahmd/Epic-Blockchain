<<<<<<< ticket-6-HashSegment
# Epic Blockchain

SecureMsg blockchain integrity verification for encrypted message envelopes.

This project hashes small batches of encrypted messages off-chain, records the
batch hash on the Sepolia Ethereum test network, and verifies a client-held
proof package against the deployed `MessageIntegrity` smart contract.

## What This Project Does

- Hashes a canonical encrypted message envelope with `keccak256`.
- Verifies that the envelope hash is included in a small segment hash list.
- Signs the segment hash with the recording wallet.
- Records the signed segment hash in a Sepolia `MessageIntegrity` contract.
- Confirms that the local proof package matches the on-chain record.
- Stores only a segment hash, recorder address, and timestamp on-chain.

## Project Structure

```text
contracts/MessageIntegrity.sol        Smart contract for recording segment hashes
verification-page/verification.html   Browser verification page
verification-page/verification.css    Verification page styling
verification-page/verification.js     Proof package verification logic
verification-page/digestUtils.js      Envelope hashing and segment digest helpers
verification-page/blockchainClient.js Sepolia contract read/write helper
config.example.js                     Safe browser config template committed to Git
config.js                             Local browser config ignored by Git
package.json                          Compile, test, and deploy scripts
scripts/deploy.ts                     Deploys the contract to Sepolia
```

## Local Configuration

Copy the example config and create a local browser config file:

```bash
cp config.example.js config.js
```

Then edit `config.js`:

```js
window.SecureMsgConfig = {
  sepoliaChainIdDecimal: 11155111,
  sepoliaChainIdHex: "0xaa36a7",
  sepoliaReadRpcUrl: "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
  expectedContractAddress: "0xYourDeployedMessageIntegrityContractAddress",
  allowedContractAddresses: [],
  maxSegmentEnvelopes: 5
};
```

`config.js` is ignored by Git. It is loaded by the browser, so do not put wallet
private keys or server-only secrets in it.

`expectedContractAddress` is required for production-style verification. The
verification page rejects proof packages that point at any other contract.

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | `0x699a37c68c99DF26b179b98811F5d25597FBA816` |

## Smart Contract Setup
=======
# SecureMsg Message Integrity Contract

A Solidity smart contract that records keccak256 hashes of SecureMsg conversation segments on-chain, providing tamper-evident proof of the messages.

## What it does

5 messages are batched up into a segment then the client:

1. Computes a keccak256 hash of the segments
2. Signs the hash with their wallet private key
3. Calls `recordDigest` on the contract, submitting the hash, signature, and the timestamp of when the segment was recorded

The contract verifies the signature matches the caller, stores the record on-chain, and emits a `DigestRecorded` event. The transaction hash from the receipt is stored client-side for later verification.

To verify a segment later, anyone can call `getRecord(hash)` with the segment hash and receive the recorder address and timestamp — no third party needed.

---

## Deployed contract

| Network | Address                                      |
|---------|----------------------------------------------|
| Sepolia | `0x699a37c68c99DF26b179b98811F5d25597FBA816` |

The ABI is generated at `abi/contracts/MessageIntegrity.sol/MessageIntegrity.json` after running `npx hardhat compile`.

---

## Contract interface

### `recordDigest(bytes32 hash, bytes signature, uint256 timestamp)`

Records a segment hash on-chain.

| Parameter   | Description                                                                                        |
|-------------|----------------------------------------------------------------------------------------------------|
| `hash`      | keccak256 hash of the conversation segment                                                         |
| `signature` | EIP-191 signature of `hash` produced by the caller's private key                                   |
| `timestamp` | Unix timestamp (seconds) of when the segment was recorded — must be non-zero and not in the future |

Emits `DigestRecorded(bytes32 indexed hash, address indexed recorder, uint256 timestamp)`.

---

### `getRecord(bytes32 hash) → (address recorder, uint256 timestamp)`

Retrieves the on-chain record for a segment hash. Free to call (no gas) from off-chain. Returns `(address(0), 0)` if the hash has not been recorded.

| Return value | Description                            |
|--------------|----------------------------------------|
| `recorder`   | Wallet address that submitted the hash |
| `timestamp`  | Unix timestamp provided at record time |

---

## Setup
>>>>>>> Mark-changes

### Prerequisites

- Node.js 22+
<<<<<<< ticket-6-HashSegment
- A Sepolia wallet with test ETH
=======
- A Sepolia wallet with test ETH ([faucet](https://sepoliafaucet.com))
>>>>>>> Mark-changes

### Install

```bash
npm install
```

<<<<<<< ticket-6-HashSegment
### Configure Deployment

```bash
cp .env.example .env
```

Then add your Sepolia RPC URL and wallet private key to `.env`:

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
WALLET_PRIVATE_KEY=0xyour_private_key_here
```

Use a test wallet only.

### Compile

```bash
npm run compile
=======
### Configure

```bash
cp .env.example .env
# Add your wallet private key to .env
```

### Compile

```bash
npx hardhat compile
>>>>>>> Mark-changes
```

### Test

```bash
<<<<<<< ticket-6-HashSegment
npm test
=======
npx hardhat test
>>>>>>> Mark-changes
```

### Deploy to Sepolia

```bash
npm run deploy
```

<<<<<<< ticket-6-HashSegment
The deployed address is printed to stdout. Update `config.js`, this README, and
any client integration with the new contract address.

## Verification Page

Open `verification-page/verification.html` in a browser, then paste or upload a
proof package and click **Verify Proof Package**.

The page checks:

- The envelope can be canonicalised and hashed.
- The optional proof envelope hash matches the computed envelope hash.
- The segment hash list rebuilds the package segment hash.
- The segment hash has been recorded on Sepolia.
- The proof contract address matches the trusted address in `config.js`.

## Contract Interface

### `recordDigest(bytes32 hash, bytes signature, uint64 timestamp)`

Records a signed segment hash on-chain.

| Parameter | Description |
|-----------|-------------|
| `hash` | Segment hash produced from the batch's envelope hashes |
| `signature` | EIP-191 signature of the segment hash, produced by the caller's wallet |
| `timestamp` | Unix timestamp when the segment was recorded, non-zero and not in the future |

Emits `DigestRecorded(bytes32 indexed hash, address indexed recorder, uint64 timestamp)`.

### `getRecord(bytes32 hash) -> (address recorder, uint256 timestamp)`

Retrieves the on-chain record for a segment hash. Returns `(address(0), 0)` if
the hash has not been recorded.

## Proof Package Format

```json
{
  "envelope": {
    "schema_version": "securemsg-envelope-v1",
    "message_type": "direct",
    "conversation_id": "direct-1-2",
    "message_id": "1",
    "sender_id": "1",
    "recipient_id": "2",
    "ciphertext": "<base64>",
    "ratchet_header_enc": "<base64>"
  },
  "proof": {
    "segment_id": "direct-1-2-local-seg-1",
    "segment_index": 0,
    "transaction_hash": "0x...",
    "contract_address": "0x...",
    "chain_name": "sepolia",
    "chain_id": 11155111,
    "segment_hash": "0x...",
    "envelope_hash": "0x...",
    "segment_hashes": [
      "0x...",
      "0x..."
    ],
    "recorded_timestamp": 1234567890,
    "recorder": "0x..."
  }
}
```

## Design Decisions

**Batching** - up to 5 messages are hashed into a segment hash rather than one
transaction per message.

**Signature verification** - the caller signs the segment hash off-chain and the
contract verifies the signature matches `msg.sender`.

**Minimal on-chain storage** - the contract stores only the segment hash,
recorder, and timestamp. Conversation and segment references stay off-chain.

**Timestamp validation** - the contract rejects zero timestamps and timestamps
that are in the future.

## Security Notes

- Do not commit `config.js`.
- Do not commit `.env`.
- Use a test wallet for Sepolia deployment.
- Keep `expectedContractAddress` set to the deployed contract you trust.
- This verifies encrypted-message integrity, not plaintext meaning or delivery.
- The verifier uses `textContent` for displaying user-provided JSON to reduce
  XSS risk.
=======
The deployed address is printed to stdout. Update the address in this README and in your client integration.

---

## Design decisions

**Batching** — up to 5 messages are hashed as a single segment rather than one transaction per message, keeping gas costs low.

**User-supplied timestamp** — the caller provides when the segment was recorded, not when it was submitted to the chain. The contract rejects future timestamps.

**Signature verification** — the caller must sign the hash with the same key used to send the transaction, preventing third-party spoofing.

**Event log** — `DigestRecorded` is emitted on every record alongside the `records` mapping, so the verification page can query by hash or filter by recorder address.
>>>>>>> Mark-changes
