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

## Web verifier

The independent verification interface lives in `verification-page/` as a React
and TypeScript app. It is read-only: it accepts a batch of encrypted envelopes,
sorts them by `message_id`, rebuilds the segment hash, and reads
`getRecord(hash)` from the Sepolia contract. The main client is responsible for
calling `recordDigest` when a segment closes.

Run it locally:

```bash
npm run dev
```

Build it:

```bash
npm run build
```

---

## Contract interface

### `recordDigest(bytes32 hash, bytes signature, uint64 timestamp)`

Records a segment hash on-chain.

| Parameter   | Description                                                                                        |
|-------------|----------------------------------------------------------------------------------------------------|
| `hash`      | keccak256 hash of the conversation segment                                                         |
| `signature` | EIP-191 signature of `hash` produced by the caller's private key                                   |
| `timestamp` | Unix timestamp (seconds) of when the segment was recorded — must be non-zero and not in the future |

Emits `DigestRecorded(bytes32 indexed hash, address indexed recorder, uint64 timestamp)`.

---

### `getRecord(bytes32 hash) → (address recorder, uint64 timestamp)`

Retrieves the on-chain record for a segment hash. Free to call (no gas) from off-chain. Returns `(address(0), 0)` if the hash has not been recorded.

| Return value | Description                            |
|--------------|----------------------------------------|
| `recorder`   | Wallet address that submitted the hash |
| `timestamp`  | Unix timestamp provided at record time |

---

## Setup

### Prerequisites

- Node.js 22+
- A Sepolia wallet with test ETH ([faucet](https://sepoliafaucet.com))

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
```

Set `WALLET_PRIVATE_KEY` for deployment. Set `VITE_CONTRACT_ADDRESS` to the deployed
`MessageIntegrity` contract that the verifier should trust.

```env
WALLET_PRIVATE_KEY=0xyour_private_key_here
VITE_CONTRACT_ADDRESS=0x699a37c68c99DF26b179b98811F5d25597FBA816
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npm test
npm run test:web
```

### Deploy to Sepolia

```bash
npm run deploy
```

The deployed address is printed to stdout. Update `VITE_CONTRACT_ADDRESS`, this
README, and the client integration.

## Web Verifier Input

Paste either an array of encrypted envelopes or an object with an `envelopes`
array:

```json
{
  "envelopes": [
    {
      "schema_version": "securemsg-envelope-v1",
      "conversation_id": "direct-1-2",
      "message_id": "1",
      "sender_id": "1",
      "recipient_id": "2",
      "ciphertext": "...",
      "ratchet_header_enc": "..."
    }
  ]
}
```

The verifier sorts envelopes by `message_id` before hashing. Alice's client must
use the same ordering rule before recording the segment hash on-chain.

---

## Design decisions

**Batching** — up to 5 messages are hashed as a single segment rather than one transaction per message, keeping gas costs low.

**User-supplied timestamp** — the caller provides when the segment was recorded, not when it was submitted to the chain. The contract rejects future timestamps.

**Signature verification** — the caller must sign the hash with the same key used to send the transaction, preventing third-party spoofing.

**Event log** — `DigestRecorded` is emitted on every record alongside the `records` mapping for auditability.
