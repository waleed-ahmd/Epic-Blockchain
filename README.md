# Epic Blockchain

SecureMsg blockchain integrity verification for encrypted message envelopes.

This project hashes small batches of encrypted messages off-chain, records the
batch hash on the Sepolia Ethereum test network, and verifies a client-held
proof package against the deployed `MessageIntegrity` smart contract.

## What This Project Does

- Hashes a canonical encrypted message envelope with `keccak256`.
- Verifies that the envelope belongs to a Merkle-rooted message segment.
- Signs the segment root with the recording wallet.
- Records the signed segment root in a Sepolia `MessageIntegrity` contract.
- Confirms that the local proof package matches the on-chain record.
- Stores only a segment hash, recorder address, and timestamp on-chain.

## Project Structure

```text
contracts/MessageIntegrity.sol        Smart contract for recording segment hashes
verification-page/verification.html   Browser verification page
verification-page/verification.css    Verification page styling
verification-page/verification.js     Proof package verification logic
verification-page/merkleUtils.js      Envelope hashing and Merkle proof helpers
verification-page/blockchainClient.js Sepolia contract read/write helper
config.example.js                     Safe config template committed to Git
config.js                             Local config ignored by Git
package.json                          Build, test, deploy, and local server scripts
scripts/build.js                      Creates the dist build output
scripts/serve.js                      Serves source or built files locally
scripts/deploy.ts                     Deploys the contract to Sepolia
```

## Local Configuration

Copy the example config and create a local config file:

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
  allowedContractAddresses: []
};
```

`config.js` is ignored by Git, so RPC URLs and deployment-specific addresses are
not committed.

`expectedContractAddress` is required for production-style verification. The
verification page rejects proof packages that point at any other contract.

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | `0x699a37c68c99DF26b179b98811F5d25597FBA816` |

## Smart Contract Setup

### Prerequisites

- Node.js 22+
- A Sepolia wallet with test ETH

### Install

```bash
npm install
```

### Configure Deployment

```bash
cp .env.example .env
```

Then add your Sepolia wallet private key to `.env`:

```env
WALLET_PRIVATE_KEY=0xyour_private_key_here
```

Use a test wallet only.

### Compile

```bash
npm run compile
```

### Test

```bash
npm test
```

### Deploy to Sepolia

```bash
npm run deploy
```

The deployed address is printed to stdout. Update `config.js`, this README, and
any client integration with the new contract address.

## Development Server

Start a local server:

```bash
npm run dev
```

Then open:

```text
http://localhost:4173/verification-page/verification.html
```

Paste or upload a proof package, then click **Verify Proof Package**.

The page checks:

- The envelope can be canonicalised and hashed.
- The optional proof leaf hash matches the computed envelope hash.
- The Merkle proof rebuilds the package segment root.
- The segment root has been recorded on Sepolia.
- The proof contract address matches the trusted address in `config.js`.

## Build And Preview

Create a static build:

```bash
npm run build
```

This writes the browser files to `dist/`. The build copies your local
`config.js` into `dist/config.js` if it exists, so `dist/` is ignored by Git.

Preview the built output:

```bash
npm run preview
```

Then open:

```text
http://localhost:4173/verification-page/verification.html
```

## Contract Interface

### `recordDigest(bytes32 hash, bytes signature, uint256 timestamp)`

Records a signed segment hash on-chain.

| Parameter | Description |
|-----------|-------------|
| `hash` | Segment hash, currently the Merkle root produced for the message batch |
| `signature` | EIP-191 signature of `hash` produced by the caller's wallet |
| `timestamp` | Unix timestamp when the segment was recorded, non-zero and not in the future |

Emits `DigestRecorded(bytes32 indexed hash, address indexed recorder, uint256 timestamp)`.

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
    "segment_root": "0x...",
    "leaf_hash": "0x...",
    "recorded_timestamp": 1234567890,
    "recorder": "0x...",
    "merkle_proof": [
      {
        "siblingHash": "0x...",
        "position": "right"
      }
    ]
  }
}
```

## Design Decisions

**Batching** - up to 5 messages are hashed into a segment root rather than one
transaction per message.

**Signature verification** - the caller signs the segment root off-chain and the
contract verifies the signature matches `msg.sender`.

**Minimal on-chain storage** - the contract stores only the segment hash,
recorder, and timestamp. Conversation and segment references stay off-chain.

## Security Notes

- Do not commit `config.js`.
- Do not commit `.env`.
- Do not commit `dist/`.
- Use a test wallet for Sepolia deployment.
- Keep `expectedContractAddress` set to the deployed contract you trust.
- This verifies encrypted-message integrity, not plaintext meaning or delivery.
- The verifier uses `textContent` for displaying user-provided JSON to reduce
  XSS risk.
