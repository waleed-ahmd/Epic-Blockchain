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
# Add your wallet private key to .env
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

### Deploy to Sepolia

```bash
npm run deploy
```

The deployed address is printed to stdout. Update the address in this README and in your client integration.

---

## Design decisions

**Batching** — up to 5 messages are hashed as a single segment rather than one transaction per message, keeping gas costs low.

**User-supplied timestamp** — the caller provides when the segment was recorded, not when it was submitted to the chain. The contract rejects future timestamps.

**Signature verification** — the caller must sign the hash with the same key used to send the transaction, preventing third-party spoofing.

**Event log** — `DigestRecorded` is emitted on every record alongside the `records` mapping, so the verification page can query by hash or filter by recorder address.
