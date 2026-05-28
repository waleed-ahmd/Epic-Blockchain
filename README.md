# Epic Blockchain

SecureMsg blockchain integrity verification for encrypted message envelopes.

This project records Merkle roots for small batches of encrypted messages on the
Sepolia Ethereum test network, then verifies a client-held proof package against
the deployed smart contract.

## What This Project Does

- Hashes a canonical encrypted message envelope with `keccak256`.
- Verifies that the envelope belongs to a Merkle-rooted message segment.
- Reads the recorded segment root from a Sepolia `MessageIntegrity` contract.
- Confirms that the local proof package matches the on-chain record.
- Stores only segment roots and references on-chain, not plaintext or ciphertext.

## Project Structure

```text
contracts/MessageIntegrity.sol        Smart contract for storing segment roots
verification-page/verification.html   Browser verification page
verification-page/verification.css    Verification page styling
verification-page/verification.js     Proof package verification logic
verification-page/merkleUtils.js      Envelope hashing and Merkle proof helpers
verification-page/blockchainClient.js Sepolia contract read/write helper
config.example.js                     Safe config template committed to Git
config.js                             Local config ignored by Git
package.json                          Build and local server scripts
scripts/build.js                      Creates the dist build output
scripts/serve.js                      Serves source or built files locally
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
- The segment root matches the Sepolia record.
- The proof contract address matches the trusted address in `config.js`.
- The conversation and segment references match when present.

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
    "record_id": 1,
    "transaction_hash": "0x...",
    "contract_address": "0x...",
    "chain_name": "sepolia",
    "chain_id": 11155111,
    "segment_root": "0x...",
    "leaf_hash": "0x...",
    "merkle_proof": [
      {
        "siblingHash": "0x...",
        "position": "right"
      }
    ]
  }
}
```

## Smart Contract

`contracts/MessageIntegrity.sol` stores one record per message segment:

- `segmentRoot`
- `conversationRef`
- `segmentRef`
- `messageCount`
- `timestamp`
- `recorder`

The contract rejects empty roots/references and limits `messageCount` to 1-5.

## Security Notes

- Do not commit `config.js`.
- Do not commit `dist/`.
- Rotate any RPC key that was committed before being moved into ignored config.
- Keep `expectedContractAddress` set to the deployed contract you trust.
- This verifies encrypted-message integrity, not plaintext meaning or delivery.
- The verifier uses `textContent` for displaying user-provided JSON to reduce
  XSS risk.
