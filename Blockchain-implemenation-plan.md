# Person 3 Blockchain Implementation Plan — Conversation Segment Merkle Root

## Scope

This document covers only the blockchain integrity-verification component for the SecureMsg project.

The blockchain component will record a `keccak256` Merkle root for a conversation segment on the Ethereum Sepolia testnet.

The system will not store plaintext messages on-chain.  
The system will not store full ciphertext messages on-chain.  
Only the segment Merkle root and minimal proof metadata are stored on-chain.

Do not implement penetration testing in this phase.  
Do not implement authentication, end-to-end encryption, backend login, C++ client internals, or group-message blockchain proof in this phase.

---

## Main Design Decision

Use **conversation segment Merkle root verification**.

Instead of writing one blockchain transaction for every message, the system groups direct message envelopes into small conversation segments.

Each encrypted message envelope is canonicalised and hashed off-chain.  
The message envelope hashes are combined into a Merkle root.  
Only the Merkle root is recorded on Sepolia.

This reduces blockchain transactions while still allowing a message to be verified as part of a notarised conversation segment.

---

## Segment Rule

For the first implementation, use this segment rule:

```text
Close and record a segment when either condition is true:
1. The segment contains 5 direct messages, OR
2. 10 minutes have passed since the first message in the open segment.
```

Use whichever happens first.

Example:

```text
Segment 1: messages 1–5       → one Merkle root → one blockchain transaction
Segment 2: messages 6–10      → one Merkle root → one blockchain transaction
Segment 3: messages 11–15     → one Merkle root → one blockchain transaction
```

If only two messages are sent and 10 minutes pass, close that segment and record its Merkle root.

---

## What the Blockchain Proof Verifies

The blockchain proof verifies:

```text
This encrypted message envelope belongs to a conversation segment whose Merkle root was recorded on Sepolia.
```

It does not verify plaintext message meaning.

It proves that the encrypted envelope and its segment proof match the on-chain segment root.

---

## Normal User Verification Flow

The user should see a simple button in the app:

```text
[Verify Message]
```

When the user clicks this button:

```text
1. The verification page receives messageId, segmentId, recordId, and contract address.
2. The verification page asks the backend for the encrypted message envelope.
3. The verification page asks the backend for the segment blockchain proof.
4. The verification page asks the backend for the Merkle proof for that message.
5. The verification page canonicalises the envelope.
6. The verification page computes the message leaf hash.
7. The verification page rebuilds the Merkle root using the Merkle proof.
8. The verification page fetches the on-chain segment root from Sepolia.
9. The verification page compares the rebuilt root with the on-chain root.
10. The page displays PASS or FAIL.
```

The user should not manually create or paste the envelope in the normal workflow.

---

## Optional Manual Mode

A manual/debug mode can be added later if useful.

Manual mode would allow a developer or demonstrator to paste:

```text
encrypted envelope JSON
segment proof JSON
Merkle proof JSON
record ID
contract address
```

This is not the main user flow.

---

## Direct Message Envelope Format

For direct one-to-one messages, use this encrypted envelope structure:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
  "conversation_id": "direct-1-2",
  "message_id": "1",
  "sender_id": "1",
  "recipient_id": "2",
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>",
  "sent_at": 1716200000
}
```

For the first implementation, support only direct one-to-one messages.

Do not implement group-message blockchain proof in this phase.

---

## Conversation ID Rule

The backend should provide a stable `conversation_id` for each direct conversation.

Recommended simple format for implementation:

```text
direct-{lower_user_id}-{higher_user_id}
```

Example:

```text
Alice user_id = 1
Bob user_id = 2
conversation_id = direct-1-2
```

If Person 2 already has another conversation ID format, use that, but it must be stable for the same pair of users.

---

## Envelope Canonicalisation Rule

The same encrypted envelope must always produce the same leaf hash.

Before hashing an envelope:

1. Use only the required fields listed in the envelope format.
2. Use exact field names.
3. Sort keys alphabetically.
4. Remove whitespace.
5. Convert IDs to strings.
6. Keep `sent_at` as a number.
7. Hash the UTF-8 bytes of the canonical JSON string.

Example canonical JSON:

```json
{"ciphertext":"abc","conversation_id":"direct-1-2","message_id":"1","message_type":"direct","ratchet_header_enc":"xyz","recipient_id":"2","schema_version":"securemsg-envelope-v1","sender_id":"1","sent_at":1716200000}
```

Message leaf hash rule:

```text
leaf_hash = keccak256(utf8Bytes(canonical_json_of_encrypted_message_envelope))
```

---

## Segment Construction Rule

A segment contains up to 5 direct message envelopes from the same conversation.

A segment also closes after 10 minutes from its first message if fewer than 5 messages have arrived.

Segment message ordering:

```text
Sort messages by sent_at ascending.
If two messages have the same sent_at, sort by message_id ascending.
```

For each message in the segment:

```text
envelope → canonical JSON → leaf_hash
```

Then build a Merkle tree from the ordered `leaf_hash` values.

---

## Merkle Tree Rule

Use `keccak256` for parent nodes.

If a tree level has an odd number of nodes, duplicate the last node.

Parent hash rule:

```text
parent = keccak256(left_hash || right_hash)
```

Do not sort the pair before hashing.  
Preserve left/right order because message order matters.

The final top hash is the segment Merkle root:

```text
segment_root = merkle_root(ordered_leaf_hashes)
```

---

## What Is Stored On-Chain

The smart contract stores one record per conversation segment:

```text
segment_root
conversation_ref
segment_ref
message_count
timestamp
recorder wallet address
```

The smart contract does not store:

```text
plaintext messages
ciphertext bodies
full message envelopes
Merkle proofs
passwords
private keys
user secrets
```

---

## Blockchain Project Structure

Create:

```text
blockchain/
├── contracts/
│   └── MessageIntegrity.sol
├── scripts/
│   └── recordSegmentRoot.js
├── utils/
│   └── merkle.js
├── abi/
│   └── MessageIntegrity.json
├── remix/
│   └── deployment-notes.md
├── package.json
├── .env.example
└── README.md
```

Create:

```text
verification-page/
├── index.html
├── verify.js
├── style.css
└── README.md
```

Create:

```text
docs/
└── blockchain-design.md
```

---

## Smart Contract Requirements

Create a Solidity smart contract named:

```text
MessageIntegrity.sol
```

The contract must:

1. Store a `bytes32` segment Merkle root.
2. Store a conversation reference, such as `direct-1-2` or an opaque backend conversation ID.
3. Store a segment reference, such as `direct-1-2-seg-1`.
4. Store the number of messages in the segment.
5. Store the block timestamp.
6. Store the wallet address that recorded the segment root.
7. Emit an event when a segment root is recorded.
8. Allow segment records to be retrieved by record ID.
9. Reject an empty root.
10. Reject a zero message count.

Recommended interface:

```solidity
function recordSegmentRoot(
    bytes32 segmentRoot,
    string calldata conversationRef,
    string calldata segmentRef,
    uint256 messageCount
) external returns (uint256);

function getRecord(uint256 recordId) external view returns (
    bytes32 segmentRoot,
    string memory conversationRef,
    string memory segmentRef,
    uint256 messageCount,
    uint256 timestamp,
    address recorder
);

function getRecordCount() external view returns (uint256);
```

Recommended event:

```solidity
event SegmentRootRecorded(
    uint256 indexed recordId,
    bytes32 indexed segmentRoot,
    string conversationRef,
    string segmentRef,
    uint256 messageCount,
    uint256 timestamp,
    address indexed recorder
);
```

---

## Smart Contract Storage Model

Use:

```solidity
struct SegmentRecord {
    bytes32 segmentRoot;
    string conversationRef;
    string segmentRef;
    uint256 messageCount;
    uint256 timestamp;
    address recorder;
}
```

Use:

```solidity
mapping(uint256 => SegmentRecord) private records;
uint256 private recordCount;
```

---

## Remix Contract Checks

Use Remix to compile and manually check:

1. Contract deployment.
2. Recording a valid segment root.
3. Rejecting `bytes32(0)` as the segment root.
4. Rejecting `messageCount = 0`.
5. Returning the correct segment root.
6. Returning the correct conversation reference.
7. Returning the correct segment reference.
8. Returning the correct message count.
9. Returning a non-zero timestamp.
10. Returning the recorder address.
11. Emitting `SegmentRootRecorded`.
12. Incrementing record count after each segment record.

Record the check results in:

```text
blockchain/remix/deployment-notes.md
```

---

## Sepolia Deployment Requirements Using Remix

Deploy the contract to Ethereum Sepolia using Remix.

Use Remix for:

1. Opening `MessageIntegrity.sol`.
2. Compiling the contract.
3. Connecting MetaMask to Sepolia.
4. Deploying the contract through **Deploy & Run Transactions**.
5. Copying the deployed contract address.
6. Copying the ABI from the **Solidity Compiler** panel.
7. Recording the deployment transaction hash from MetaMask or the Sepolia block explorer.

Record these values:

```text
contract_address
contract_abi_path
deployment_transaction_hash
network_name = sepolia
chain_id = 11155111
```

Save the copied ABI here:

```text
blockchain/abi/MessageIntegrity.json
```

Create `.env.example` for the recording script:

```text
SEPOLIA_RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=
```

Do not commit the real `.env` file.

---

## Segment Recording Script

Create:

```text
blockchain/scripts/recordSegmentRoot.js
```

The script should:

1. Accept a segment object as input.
2. Read the encrypted message envelopes in that segment.
3. Canonicalise each envelope.
4. Compute a `keccak256` leaf hash for each envelope.
5. Build a Merkle root from the ordered leaf hashes.
6. Call `recordSegmentRoot(bytes32 segmentRoot, string conversationRef, string segmentRef, uint256 messageCount)` on the deployed contract.
7. Wait for transaction confirmation.
8. Extract `recordId` from the emitted event.
9. Return a blockchain segment proof object.

Input segment object format:

```json
{
  "conversation_id": "direct-1-2",
  "segment_id": "direct-1-2-seg-1",
  "messages": [
    {
      "schema_version": "securemsg-envelope-v1",
      "message_type": "direct",
      "conversation_id": "direct-1-2",
      "message_id": "1",
      "sender_id": "1",
      "recipient_id": "2",
      "ciphertext": "<base64>",
      "ratchet_header_enc": "<base64>",
      "sent_at": 1716200000
    }
  ]
}
```

Returned segment proof object format:

```json
{
  "segment_root": "0x...",
  "record_id": 1,
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "conversation_ref": "direct-1-2",
  "segment_ref": "direct-1-2-seg-1",
  "message_count": 5,
  "recorded_at": 1716200000
}
```

---

## Merkle Proof Format

For verifying a single message inside a segment, the backend should provide a Merkle proof.

Recommended Merkle proof object:

```json
{
  "leaf_hash": "0x...",
  "leaf_index": 0,
  "siblings": [
    {
      "position": "right",
      "hash": "0x..."
    },
    {
      "position": "left",
      "hash": "0x..."
    }
  ]
}
```

Position meaning:

```text
right = sibling was on the right side of the current hash
left  = sibling was on the left side of the current hash
```

Verification rule:

```text
Start with leaf_hash.
For each sibling:
  if position == right:
      current = keccak256(current || sibling_hash)
  if position == left:
      current = keccak256(sibling_hash || current)
Final current value must equal the segment root.
```

---

## Backend Integration Required From Person 2

Person 2 must provide the backend data and endpoints needed for automatic segment verification.

### 1. Message response fields

When a direct message is created, the backend should return:

```json
{
  "id": 1,
  "conversation_id": "direct-1-2",
  "sender_id": 1,
  "recipient_id": 2,
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>",
  "sent_at": 1716200000
}
```

These fields are needed to build the encrypted message envelope.

### 2. Segment tracking fields

Person 2 should add segment tracking fields to messages:

```text
conversation_id
segment_id
segment_index
envelope_hash
segment_status
```

Recommended `segment_status` values:

```text
open
closed
recorded
```

### 3. Segment proof storage fields

Person 2 should add a segment proof table or equivalent fields:

```text
segment_id
conversation_id
segment_start_message_id
segment_end_message_id
message_count
segment_root
blockchain_record_id
blockchain_tx_hash
blockchain_contract_address
blockchain_chain_name
blockchain_chain_id
blockchain_recorded_at
```

### 4. Open segment rule

For each direct conversation, the backend should maintain one open segment.

A segment closes when:

```text
message_count == 5
OR
current_time - first_message_sent_at >= 10 minutes
```

When a segment closes, it is ready to be recorded on-chain.

### 5. Fetch closed segment endpoint

```text
GET /api/v1/conversations/{conversation_id}/segments/{segment_id}
```

Expected response:

```json
{
  "conversation_id": "direct-1-2",
  "segment_id": "direct-1-2-seg-1",
  "status": "closed",
  "messages": [
    {
      "schema_version": "securemsg-envelope-v1",
      "message_type": "direct",
      "conversation_id": "direct-1-2",
      "message_id": "1",
      "sender_id": "1",
      "recipient_id": "2",
      "ciphertext": "<base64>",
      "ratchet_header_enc": "<base64>",
      "sent_at": 1716200000
    }
  ]
}
```

### 6. Store blockchain segment proof endpoint

```text
POST /api/v1/conversations/{conversation_id}/segments/{segment_id}/blockchain-record
```

Request body:

```json
{
  "segment_root": "0x...",
  "record_id": 1,
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "message_count": 5,
  "recorded_at": 1716200000
}
```

Expected response:

```json
{
  "conversation_id": "direct-1-2",
  "segment_id": "direct-1-2-seg-1",
  "status": "recorded"
}
```

### 7. Fetch message envelope endpoint

```text
GET /api/v1/messages/{message_id}/envelope
```

Expected response:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
  "conversation_id": "direct-1-2",
  "message_id": "1",
  "sender_id": "1",
  "recipient_id": "2",
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>",
  "sent_at": 1716200000
}
```

This endpoint must enforce access control.  
Only the sender or recipient of the message should be able to fetch the envelope.

### 8. Fetch message segment proof endpoint

```text
GET /api/v1/messages/{message_id}/segment-proof
```

Expected response:

```json
{
  "message_id": "1",
  "conversation_id": "direct-1-2",
  "segment_id": "direct-1-2-seg-1",
  "segment_root": "0x...",
  "blockchain_record_id": 1,
  "blockchain_tx_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "message_count": 5,
  "recorded_at": 1716200000,
  "merkle_proof": {
    "leaf_hash": "0x...",
    "leaf_index": 0,
    "siblings": [
      {
        "position": "right",
        "hash": "0x..."
      }
    ]
  }
}
```

This endpoint must enforce access control.  
Only the sender or recipient of the message should be able to fetch the segment proof.

---

## What Person 2 Needs From Person 3

Provide Person 2 with:

1. Smart contract address.
2. Smart contract ABI.
3. Sepolia chain ID.
4. Exact envelope format.
5. Exact canonicalisation rule.
6. Exact leaf hash rule.
7. Exact Merkle tree rule.
8. Exact Merkle proof format.
9. Segment proof object format.
10. Backend request body for storing blockchain segment proof.
11. Example valid segment proof object.

Rules to share:

```text
leaf_hash = keccak256(utf8Bytes(canonical_json_of_encrypted_message_envelope))
segment_root = merkle_root(ordered_leaf_hashes)
```

---

## Frontend / C++ Client Integration Required From Person 1

Person 1 should add blockchain segment proof support to the message UI/client.

### After sending a message

The app does not need to show a blockchain transaction immediately for every message.

Instead, it should show one of these states:

```text
Message sent successfully.
Blockchain status: Pending segment recording.
```

or, after the segment is recorded:

```text
Message sent successfully.
Blockchain segment recorded.
Segment ID: direct-1-2-seg-1
Blockchain Record ID: 1
Transaction Hash: 0x...
[Verify Message]
```

### Verify button

The **Verify Message** button should open the verification page with query parameters:

```text
verification-page/index.html?messageId=1&recordId=1&contract=0x...
```

Minimum query parameters:

```text
messageId
recordId
contract
```

Optional query parameters:

```text
backendBaseUrl
segmentId
```

Example:

```text
verification-page/index.html?messageId=1&recordId=1&contract=0x123...&backendBaseUrl=https://team.theburkenator.com/api/v1
```

### Optional display text

Person 1 can show:

```text
This message is verified as part of conversation segment direct-1-2-seg-1.
```

---

## What Person 1 Needs From Person 3

Provide Person 1 with:

1. Verification page path or URL.
2. Required query parameters.
3. Contract address.
4. Example record ID.
5. Example message ID.
6. Example segment ID.
7. Example verification URL.
8. Short explanation of what the Verify button does.

Example explanation:

```text
The Verify Message button opens the verification page with the message ID and blockchain record ID. The page fetches the encrypted envelope and segment proof automatically, rebuilds the Merkle root, checks it against Sepolia, and shows PASS or FAIL.
```

---

## Verification Page Requirements

The verification page should support the automatic flow first.

### Inputs from URL

Read these query parameters:

```text
messageId
recordId
contract
backendBaseUrl
```

If `backendBaseUrl` is not provided, use a configured default.

### Automatic verification steps

```text
1. Read messageId, recordId, and contract address from URL.
2. Fetch encrypted envelope from:
   GET /api/v1/messages/{messageId}/envelope
3. Fetch segment proof from:
   GET /api/v1/messages/{messageId}/segment-proof
4. Canonicalise the envelope.
5. Compute local leaf hash.
6. Compare local leaf hash with backend-provided leaf_hash.
7. Rebuild Merkle root using the Merkle proof.
8. Connect to Sepolia using ethers.js.
9. Call getRecord(recordId) on the smart contract.
10. Compare rebuilt Merkle root with on-chain segment root.
11. Compare backend-stored segment root with on-chain segment root.
12. Compare contract segmentRef/conversationRef with backend segment data.
13. Display PASS or FAIL.
```

### Display fields

Show:

```text
Message ID
Conversation ID
Segment ID
Record ID
Transaction hash
Contract address
Chain name
Canonical JSON
Locally computed leaf hash
Backend provided leaf hash
Rebuilt Merkle root
Backend stored segment root
On-chain segment root
Blockchain timestamp
Recorder wallet address
Verification result
```

### Result rules

```text
PASS:
- local leaf hash matches backend-provided leaf_hash
- Merkle proof rebuilds the same segment root
- rebuilt segment root matches on-chain segment root
- backend stored segment root matches on-chain segment root
- segmentRef from contract matches backend segment_id
- conversationRef from contract matches backend conversation_id

FAIL:
- local leaf hash does not match backend-provided leaf_hash
- Merkle proof does not rebuild the expected segment root
- rebuilt segment root does not match on-chain segment root
- backend stored segment root does not match on-chain segment root
- segmentRef or conversationRef does not match
- recordId does not exist
- backend proof is missing
- contract call fails
```

---

## Verification Page JavaScript Functions

Implement these in:

```text
verification-page/verify.js
```

### `getQueryParams()`

Reads:

```text
messageId
recordId
contract
backendBaseUrl
```

### `fetchEnvelope(messageId, backendBaseUrl)`

Calls:

```text
GET /api/v1/messages/{messageId}/envelope
```

Returns the encrypted envelope.

### `fetchSegmentProof(messageId, backendBaseUrl)`

Calls:

```text
GET /api/v1/messages/{messageId}/segment-proof
```

Returns the backend-stored segment proof and Merkle proof.

### `canonicaliseEnvelope(envelope)`

- Keeps only required fields.
- Sorts keys alphabetically.
- Converts IDs to strings.
- Keeps `sent_at` as number.
- Returns compact JSON string.

### `computeLeafHash(envelope)`

- Calls `canonicaliseEnvelope(envelope)`.
- Computes `keccak256(utf8Bytes(canonicalJson))`.
- Returns leaf hash.

### `rebuildMerkleRoot(leafHash, merkleProof)`

- Starts with `leafHash`.
- Applies each sibling in order.
- Uses left/right sibling position.
- Returns the rebuilt Merkle root.

### `getContract(contractAddress)`

- Connects to Sepolia using `ethers.js`.
- Loads the contract ABI.
- Returns contract instance.

### `fetchOnChainRecord(contractAddress, recordId)`

- Calls `getRecord(recordId)`.
- Returns segmentRoot, conversationRef, segmentRef, messageCount, timestamp, and recorder address.

### `verifyMessageAutomatically()`

- Reads URL parameters.
- Fetches envelope.
- Fetches segment proof.
- Computes local leaf hash.
- Rebuilds Merkle root.
- Fetches on-chain record.
- Compares values.
- Displays PASS or FAIL.

### `displayResult(result)`

Displays all verification details clearly.

---

## End-to-End Automatic Segment Blockchain Flow

```text
1. Person 1 sends encrypted direct messages through backend.
2. Person 2 backend stores ciphertext and assigns each message to the current open conversation segment.
3. Segment closes after 5 messages or 10 minutes, whichever comes first.
4. Person 3 blockchain script fetches the closed segment from backend.
5. Blockchain script canonicalises each encrypted envelope.
6. Blockchain script computes one leaf hash per envelope.
7. Blockchain script builds the segment Merkle root.
8. Blockchain script records the segment root on Sepolia.
9. Contract emits SegmentRootRecorded event.
10. Blockchain script extracts record ID and transaction hash.
11. Blockchain proof is sent to Person 2 backend.
12. Backend stores blockchain proof against the segment.
13. Person 1 displays segment ID, transaction hash, record ID, and Verify Message button.
14. User clicks Verify Message.
15. Verification page fetches encrypted envelope from backend.
16. Verification page fetches segment proof and Merkle proof from backend.
17. Verification page fetches on-chain segment root from Sepolia.
18. Verification page recomputes leaf hash and rebuilds the Merkle root.
19. Verification page displays PASS or FAIL.
```

---

## Files To Produce

Blockchain files:

```text
blockchain/contracts/MessageIntegrity.sol
blockchain/scripts/recordSegmentRoot.js
blockchain/utils/merkle.js
blockchain/abi/MessageIntegrity.json
blockchain/remix/deployment-notes.md
blockchain/package.json
blockchain/.env.example
blockchain/README.md
```

Verification page files:

```text
verification-page/index.html
verification-page/verify.js
verification-page/style.css
verification-page/README.md
```

Documentation file:

```text
docs/blockchain-design.md
```

---

## `docs/blockchain-design.md` Content

Keep this document short and implementation-focused.

Include:

1. Purpose of blockchain component.
2. Why encrypted message envelopes are hashed.
3. Why conversation segments are used instead of one transaction per message.
4. Segment rule: 5 messages or 10 minutes, whichever comes first.
5. Canonical envelope format.
6. Leaf hash rule.
7. Merkle root construction rule.
8. Smart contract address.
9. ABI location.
10. Sepolia deployment transaction hash.
11. Automatic verification flow.
12. What is stored on-chain.
13. What is not stored on-chain.
14. Limitations.

Important limitation:

```text
The blockchain proves that a conversation segment root was recorded at a certain time. It does not reveal or verify plaintext message meaning, and it does not stop the server from refusing to deliver messages.
```

Trade-off to explain:

```text
Recording one Merkle root per segment reduces gas cost compared with recording one transaction per message. The trade-off is that verification requires segment metadata and a Merkle proof, but this is handled automatically by the verification page.
```

---

## Implementation Order

1. Create the blockchain folder structure.
2. Implement `MessageIntegrity.sol` for segment roots.
3. Compile the contract in Remix.
4. Use Remix to run the contract checks listed above.
5. Deploy to Sepolia using Remix and MetaMask.
6. Save contract address, ABI, and deployment transaction hash.
7. Implement envelope canonicalisation.
8. Implement leaf hash computation.
9. Implement Merkle root and Merkle proof utilities.
10. Implement `recordSegmentRoot.js`.
11. Test recording one sample segment on Sepolia.
12. Ask Person 2 for segment/envelope/proof endpoints.
13. Ask Person 1 for Verify Message button support.
14. Build automatic verification page.
15. Test automatic PASS with unchanged envelope and valid Merkle proof.
16. Test automatic FAIL after changing ciphertext, timestamp, Merkle proof, or record ID.
17. Store segment blockchain proof in backend.
18. Display segment ID, record ID, transaction hash, and Verify Message link in frontend/client.

---

## Sample Test Segment

Use this before backend integration:

```json
{
  "conversation_id": "direct-1-2",
  "segment_id": "direct-1-2-seg-1",
  "messages": [
    {
      "schema_version": "securemsg-envelope-v1",
      "message_type": "direct",
      "conversation_id": "direct-1-2",
      "message_id": "1",
      "sender_id": "1",
      "recipient_id": "2",
      "ciphertext": "VGhpcyBpcyBhIHRlc3QgY2lwaGVydGV4dA==",
      "ratchet_header_enc": "VGhpcyBpcyBhIHRlc3QgcmF0Y2hldCBoZWFkZXI=",
      "sent_at": 1716200000
    },
    {
      "schema_version": "securemsg-envelope-v1",
      "message_type": "direct",
      "conversation_id": "direct-1-2",
      "message_id": "2",
      "sender_id": "2",
      "recipient_id": "1",
      "ciphertext": "U2Vjb25kIHRlc3QgY2lwaGVydGV4dA==",
      "ratchet_header_enc": "U2Vjb25kIHRlc3QgcmF0Y2hldCBoZWFkZXI=",
      "sent_at": 1716200060
    }
  ]
}
```

Expected behaviour:

```text
Original message envelope + valid Merkle proof → verification PASS
Change ciphertext → verification FAIL
Change recipient_id → verification FAIL
Change sent_at → verification FAIL
Use wrong Merkle proof → verification FAIL
Use wrong record ID → verification FAIL
```

---

## Out of Scope for This Phase

Do not implement these in this phase:

```text
penetration testing
AI artefact documentation
authentication
SRP
TOTP
JWT
message encryption/decryption
C++ client internals
group message blockchain proof
smart contract access-control roles
message storage on-chain
plaintext message hashing
private key storage
manual envelope paste as the main user flow
one blockchain transaction per message
full conversation hashing
```
