# Person 3 Final Updated Implementation Plan

## 1. Final Design Decision

The blockchain proof system will use **client-side segmentation**.

This means:

```text
Backend does not create blockchain segments.
Backend does not create Merkle roots.
Backend does not create Merkle proofs.
Backend does not record anything on blockchain.

Client receives encrypted messages.
Client validates/decrypts accepted messages.
Client groups accepted messages into local segments.
Client uses Person 3's Merkle/blockchain code.
Client records the segment root on Sepolia.
Client stores proof packages locally.
```

This updates the previous plan. The previous plan already moved toward a client-owned proof model, but it still included `sent_at` in several examples. Since Person 2 confirmed that `sent_at` is not separately stored, the final canonical blockchain envelope should **not depend on `sent_at`**.

---

## 2. What Remains From the Previous Plan

Keep these parts:

```text
- MessageIntegrity.sol smart contract
- Sepolia deployment using Remix
- keccak256 hashing
- Merkle root per conversation segment
- 5 messages OR 10 minutes segment rule
- store only segment root on-chain
- do not store plaintext on-chain
- do not store ciphertext on-chain
- do not store Merkle proofs on-chain
- provide merkleUtils.js
- provide blockchainClient.js
- provide record.html demo page
- provide index.html verification page
- provide proof package format
```

Update these parts:

```text
- remove sent_at from canonical envelope
- backend only returns basic encrypted message fields
- client builds the full blockchain envelope locally
- client owns segmentation and local proof packages
- verification page verifies client-held proof package
```

---

## 3. Final Blockchain Envelope

Backend/current message format:

```json
{
  "id": 1,
  "sender_id": 3,
  "recipient_id": 2,
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>"
}
```

Client converts it into this blockchain envelope:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
  "conversation_id": "direct-2-3",
  "message_id": "1",
  "sender_id": "3",
  "recipient_id": "2",
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>"
}
```

### Field purpose

| Field | Source | Purpose |
|---|---|---|
| `schema_version` | Client hardcoded | fixes envelope format version |
| `message_type` | Client hardcoded | direct message only |
| `conversation_id` | Client derived | ties message to one chat |
| `message_id` | backend `id` mapped by client | links proof to message |
| `sender_id` | backend | identifies sender |
| `recipient_id` | backend | identifies receiver |
| `ciphertext` | backend | encrypted message body |
| `ratchet_header_enc` | backend | encrypted E2EE ratchet header |

Conversation ID rule:

```text
conversation_id = direct-{lower_user_id}-{higher_user_id}
```

Example:

```text
sender_id = 3
recipient_id = 2
conversation_id = direct-2-3
```

---

## 4. Canonicalisation Rule

Use only these fields in this exact sorted order:

```text
ciphertext
conversation_id
message_id
message_type
ratchet_header_enc
recipient_id
schema_version
sender_id
```

Do not include:

```text
sent_at
plaintext
delivery status
revocation token
temporary backend fields
```

Canonical JSON example:

```json
{"ciphertext":"abc","conversation_id":"direct-2-3","message_id":"1","message_type":"direct","ratchet_header_enc":"xyz","recipient_id":"2","schema_version":"securemsg-envelope-v1","sender_id":"3"}
```

Hash rule:

```text
leaf_hash = keccak256(utf8Bytes(canonical_json))
```

---

## 5. Segment Rule

The client maintains a local open segment per conversation.

Close a segment when:

```text
5 accepted messages are collected
OR
10 minutes pass since the first message in the local open segment
```

Only client-accepted messages are added to a segment.

A message is accepted only after:

```text
- required fields exist
- sender/recipient match expected chat
- message is not duplicate
- message decrypts/authenticates successfully
```

Recommended segment ID:

```text
{conversation_id}-local-seg-{number}
```

Example:

```text
direct-2-3-local-seg-1
```

Ordering:

```text
Use the order in which the client accepted the messages.
Store segment_index for each message.
```

---

# 6. My Responsibilities as Person 3

## 6.1 Smart Contract

I provide and deploy:

```text
MessageIntegrity.sol
```

The contract stores:

```text
segmentRoot
conversationRef
segmentRef
messageCount
timestamp
recorder
```

The contract does not store:

```text
plaintext
ciphertext
full envelopes
Merkle proofs
private keys
passwords
```

Main function:

```solidity
recordSegmentRoot(
    bytes32 segmentRoot,
    string calldata conversationRef,
    string calldata segmentRef,
    uint8 messageCount
)
```

Read function:

```solidity
getRecord(uint256 recordId)
```

Contract checks:

```text
- segmentRoot must not be empty
- conversationRef must not be empty
- segmentRef must not be empty
- messageCount must be greater than 0
- messageCount must be 5 or less
```

## 6.2 Merkle Utility

I provide:

```text
verification-page/merkleUtils.js
```

Functions:

```text
canonicaliseEnvelope(envelope)
computeEnvelopeHash(envelope)
buildMerkleTreeFromHashes(hashes)
buildMerkleTreeFromEnvelopes(envelopes)
getMerkleProof(tree, leafIndex)
verifyMerkleProof(leafHash, proof, expectedRoot)
buildSegmentProof(envelopes)
```

`buildSegmentProof(envelopes)` returns:

```json
{
  "segmentRoot": "0x...",
  "leafHashes": {
    "1": "0x..."
  },
  "messageProofs": {
    "1": [
      {
        "siblingHash": "0x...",
        "position": "right"
      }
    ]
  }
}
```

## 6.3 Blockchain Client Utility

I provide:

```text
verification-page/blockchainClient.js
```

Functions:

```text
connectWallet()
ensureSepoliaNetwork()
recordSegmentRoot(...)
fetchSegmentRecord(...)
fetchRecordCount()
```

Example call:

```javascript
const chainProof = await SecureMsgBlockchain.recordSegmentRoot({
  contractAddress: CONTRACT_ADDRESS,
  segmentRoot: segmentProof.segmentRoot,
  conversationRef: "direct-2-3",
  segmentRef: "direct-2-3-local-seg-1",
  messageCount: envelopes.length
});
```

Expected output:

```json
{
  "record_id": 1,
  "segment_root": "0x...",
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "conversation_ref": "direct-2-3",
  "segment_ref": "direct-2-3-local-seg-1",
  "message_count": 3,
  "recorder": "0x..."
}
```

## 6.4 Record Demo Page

I provide:

```text
verification-page/record.html
```

Purpose:

```text
- paste sample envelopes
- build Merkle root
- record root on Sepolia
- generate proof packages
- copy proof packages for testing
```

## 6.5 Verification Page

I provide:

```text
verification-page/index.html
```

The page verifies a client-held proof package.

It should support:

```text
- paste proof package JSON
- upload proof package JSON
- automatic proof package input from Person 1 later
```

Verification steps:

```text
1. read proof package
2. canonicalise envelope
3. compute local leaf hash
4. compare local leaf hash with proof.leaf_hash
5. apply Merkle proof
6. rebuild segment root
7. fetch on-chain record using record_id
8. compare rebuilt root with on-chain root
9. compare proof.segment_root with on-chain root
10. show PASS or FAIL
```

## 6.6 Proof Package Format

The client stores one proof package per message:

```json
{
  "envelope": {
    "schema_version": "securemsg-envelope-v1",
    "message_type": "direct",
    "conversation_id": "direct-2-3",
    "message_id": "1",
    "sender_id": "3",
    "recipient_id": "2",
    "ciphertext": "<base64>",
    "ratchet_header_enc": "<base64>"
  },
  "proof": {
    "segment_id": "direct-2-3-local-seg-1",
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

---

# 7. What I Need From Person 1

Person 1 is the main integration partner.

## 7.1 Build Blockchain Envelope Locally

When Person 1 receives:

```json
{
  "id": 1,
  "sender_id": 3,
  "recipient_id": 2,
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>"
}
```

Person 1 converts it into:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
  "conversation_id": "direct-2-3",
  "message_id": "1",
  "sender_id": "3",
  "recipient_id": "2",
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>"
}
```

## 7.2 Validate Before Segmenting

Person 1 should add a message to a segment only after:

```text
- required fields exist
- sender/recipient match the current chat
- message is not duplicate
- decryption/authentication succeeds
```

## 7.3 Group Messages Into Local Segments

Person 1 should implement local segmentation:

```text
5 accepted messages OR 10 minutes
```

For each segment, store:

```text
conversation_id
segment_id
message_ids
segment_index per message
segment status
```

## 7.4 Call My Merkle and Blockchain Functions

When a segment closes:

```javascript
const segmentProof = SecureMsgMerkle.buildSegmentProof(envelopes);

const chainProof = await SecureMsgBlockchain.recordSegmentRoot({
  contractAddress: CONTRACT_ADDRESS,
  segmentRoot: segmentProof.segmentRoot,
  conversationRef: conversationId,
  segmentRef: segmentId,
  messageCount: envelopes.length
});
```

## 7.5 Store Proof Packages Locally

Person 1 should store one proof package per message.

Possible storage:

```text
browser localStorage
browser IndexedDB
local JSON files
local SQLite database
```

For the C++ client, local JSON files are enough for demo.

## 7.6 Add Verify Button

Person 1 should add:

```text
[Verify Message]
```

When clicked:

```text
1. find proof package by message_id
2. pass proof package to my verification page/function
3. display PASS/FAIL
```

The user should not manually search for files.

## 7.7 Questions For Person 1

```text
1. Where will the client store local proof packages?
2. Can the client call my JavaScript utilities directly?
3. If using C++ client, will it open a browser helper page for MetaMask recording?
4. Can the client pass proof package JSON to my verification page automatically?
5. Can the client expose Export Proof JSON for demo fallback?
```

---

# 8. What I Need From Person 2

Person 2's role is small.

Person 2 does not need to create blockchain segments, Merkle roots, Merkle proofs, or blockchain records.

## 8.1 Backend Message Response Needed

I only need the backend/client response to include:

```json
{
  "id": 1,
  "sender_id": 3,
  "recipient_id": 2,
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>"
}
```

If `recipient_id` is not currently returned in `GET /messages/`, then either:

```text
- add recipient_id to the response, or
- Person 1 infers recipient_id from the authenticated user
```

Returning it explicitly is cleaner.

## 8.2 What Person 2 Does Not Need To Do

Person 2 does not need to implement:

```text
blockchain segment table
Merkle proof endpoint
blockchain record endpoint
segment root storage
verification endpoint
on-chain transaction handling
sent_at for blockchain proof
```

## 8.3 Questions For Person 2

```text
1. Does GET /messages/ return id, sender_id, recipient_id, ciphertext, ratchet_header_enc?
2. If recipient_id is not returned, can it be added?
3. Is id stable for the message?
4. Are ciphertext and ratchet_header_enc returned unchanged?
5. Does the backend delete message only after successful download/receipt handling?
```

---

# 9. What I Give Back To Person 1

I give Person 1:

```text
1. MessageIntegrity.sol contract address
2. contract ABI
3. Sepolia chain ID: 11155111
4. merkleUtils.js
5. blockchainClient.js
6. record.html demo page
7. index.html verification page
8. final blockchain envelope format
9. proof package format
10. example buildSegmentProof call
11. example recordSegmentRoot call
12. example proof package JSON
13. Verify Message flow explanation
```

Short handoff message:

```text
The client is responsible for local blockchain proofing. After a message is downloaded and accepted, build the blockchain envelope from the backend message fields, group accepted envelopes into segments of 5 messages or 10 minutes, call my buildSegmentProof(envelopes), record the segment root on Sepolia using my recordSegmentRoot helper, and store one proof package per message locally. The Verify Message button should load that proof package and send it to my verification page/function.
```

---

# 10. What I Give Back To Person 2

I give Person 2:

```text
1. final minimum backend fields needed
2. explanation that backend does not own blockchain proofing
3. confirmation that sent_at is not required
4. confirmation that schema_version/message_type/conversation_id are client-created
5. confirmation that backend can delete messages after successful download
```

Short handoff message:

```text
For the updated blockchain design, the backend does not need to create segments, Merkle roots, Merkle proofs, or blockchain records. I only need the client to receive id, sender_id, recipient_id, ciphertext, and ratchet_header_enc when downloading messages. The client will map id to message_id, derive conversation_id locally, hardcode schema_version/message_type, and handle all blockchain proof logic locally. sent_at is not required for the blockchain canonical envelope.
```

---

# 11. Updated Implementation Order For Me

## Step 1 — Finalise Envelope Format

Remove `sent_at` from the blockchain canonical envelope.

Canonical fields:

```text
ciphertext
conversation_id
message_id
message_type
ratchet_header_enc
recipient_id
schema_version
sender_id
```

## Step 2 — Update `merkleUtils.js`

Make sure it:

```text
- validates the final envelope format
- canonicalises only the final fields
- computes keccak256 leaf hash
- builds Merkle root
- builds per-message proof
- verifies proof
```

## Step 3 — Test Merkle Locally

Use 2–5 fake envelopes.

Tests:

```text
original envelope → PASS
changed ciphertext → FAIL
changed ratchet_header_enc → FAIL
changed sender_id → FAIL
changed recipient_id → FAIL
changed message_id → FAIL
wrong Merkle proof → FAIL
```

## Step 4 — Keep/Deploy `MessageIntegrity.sol`

Deploy using Remix to Sepolia.

Save:

```text
contract address
ABI
deployment transaction hash
chain_id = 11155111
```

## Step 5 — Update `blockchainClient.js`

Make sure it can:

```text
connect MetaMask
switch to Sepolia
record segment root
extract record_id
fetch on-chain record
```

## Step 6 — Update `record.html`

Generate:

```text
segment root
transaction hash
record ID
proof package JSON
```

## Step 7 — Update `index.html`

Verify proof package JSON:

```text
paste/upload proof package
compute leaf hash
verify Merkle proof
fetch on-chain root
compare
show PASS/FAIL
```

## Step 8 — Handoff To Person 1

Give Person 1:

```text
files
contract address
ABI
example calls
proof package format
Verify Message flow
```

## Step 9 — Handoff To Person 2

Give Person 2:

```text
minimum backend fields needed
no sent_at required
no blockchain endpoints required
```

## Step 10 — Final Integration Testing

Test with real client messages:

```text
download message
client builds envelope
client groups segment
client records root
client stores proof package
verify unchanged package → PASS
modify ciphertext → FAIL
modify proof → FAIL
wrong record ID → FAIL
```

---

# 12. Security Notes

## Malicious Backend Adds Fake Message

Client must reject messages that fail decryption/authentication.

Only accepted messages are segmented.

## Malicious Backend Modifies Ciphertext

Tampered ciphertext should fail E2EE authentication.

It should not enter the segment.

## Malicious Backend Drops/Delays Messages

Blockchain does not solve delivery availability.

The proof only verifies accepted local messages.

## Backend Deletes Messages

This is fine.

Client stores proof packages locally.

## Client Loses Proof Package

Verification may not be possible.

Optional fallback:

```text
Export Proof JSON
Import Proof JSON
```

## Compromised Client

Blockchain cannot protect against a fully compromised endpoint.

---

# 13. Final Responsibilities Summary

## Person 1

```text
- convert backend message into blockchain envelope
- validate/decrypt before segmenting
- group accepted envelopes into local segments
- call Person 3 Merkle/blockchain functions
- store proof packages locally
- add Verify Message button
```

## Person 2

```text
- return id, sender_id, recipient_id, ciphertext, ratchet_header_enc
- keep fields stable and unchanged
- no blockchain endpoints needed
- no Merkle proof storage needed
- no sent_at required
```

## Person 3

```text
- provide smart contract
- deploy to Sepolia
- provide ABI and contract address
- provide Merkle utilities
- provide blockchain recording/reading utilities
- provide record demo page
- provide verification page
- provide proof package format and documentation
```

---

# 14. Final One-Line Architecture

```text
Backend returns encrypted message fields; client builds local segments and proof packages; Person 3's blockchain code records only the segment root on Sepolia; verification checks the local proof package against the on-chain root.
```
