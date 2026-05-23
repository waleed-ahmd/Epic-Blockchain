# Person 3 Blockchain Implementation Plan — Automatic Verification Flow (Remix Deployment)

## Scope

This document covers only the blockchain integrity-verification component for the SecureMsg project.

The blockchain component will:

1. Compute a `keccak256` digest of an encrypted message envelope.
2. Store the digest on a Sepolia smart contract with a timestamp.
3. Return a blockchain transaction hash and record ID.
4. Store the blockchain proof against the backend message record.
5. Allow the user to click **Verify Message** and automatically verify that the encrypted message envelope has not changed.

Do not implement penetration testing in this phase.  
Do not implement authentication, end-to-end encryption, backend login, C++ client internals, or group-message blockchain support in this phase.

---

## Main Design Decision

Use **encrypted message envelope hashing**.

The blockchain proof verifies the encrypted message record, not the plaintext message.

This means the blockchain component proves:

> The encrypted message envelope stored by the system has not changed since its digest was recorded on Sepolia.

The verification page should not ask the normal user to paste plaintext or ciphertext manually.  
The normal flow is automatic.

---

## Normal User Verification Flow

The user should see a simple button in the app:

```text
[Verify Message]
```

When the user clicks this button:

```text
1. The verification page receives messageId and recordId.
2. The verification page asks the backend for the encrypted message envelope.
3. The verification page asks the backend for the blockchain proof.
4. The verification page canonicalises the envelope.
5. The verification page computes keccak256 of the canonical envelope.
6. The verification page fetches the on-chain digest from the Sepolia contract.
7. The verification page compares both digests.
8. The page displays PASS or FAIL.
```

The user should not manually create or paste the envelope in the normal workflow.

---

## Optional Manual Mode

A manual/debug mode can be added later if useful.

Manual mode would allow a developer or demonstrator to paste the encrypted envelope JSON and record ID manually.

This is not the main user flow.

---

## Encrypted Message Envelope Format

For direct one-to-one messages, use this structure:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
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

## Canonicalisation Rule

The same encrypted envelope must always produce the same digest.

Before hashing:

1. Use only the required fields listed in the envelope format.
2. Use exact field names.
3. Sort keys alphabetically.
4. Remove whitespace.
5. Convert IDs to strings.
6. Keep `sent_at` as a number.
7. Hash the UTF-8 bytes of the canonical JSON string.

Example canonical JSON:

```json
{"ciphertext":"abc","message_id":"1","message_type":"direct","ratchet_header_enc":"xyz","recipient_id":"2","schema_version":"securemsg-envelope-v1","sender_id":"1","sent_at":1716200000}
```

Digest rule:

```text
blockchain_digest = keccak256(utf8Bytes(canonical_json))
```

---

## Blockchain Project Structure

Create:

```text
blockchain/
├── contracts/
│   └── MessageIntegrity.sol
├── scripts/
│   └── recordDigest.js
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

1. Store a `bytes32` digest.
2. Store a message reference, such as backend `message_id`.
3. Store the block timestamp.
4. Store the wallet address that recorded the digest.
5. Emit an event when a digest is recorded.
6. Allow records to be retrieved by record ID.
7. Reject an empty digest.

Recommended interface:

```solidity
function recordDigest(bytes32 digest, string calldata messageRef) external returns (uint256);

function getRecord(uint256 recordId) external view returns (
    bytes32 digest,
    string memory messageRef,
    uint256 timestamp,
    address recorder
);

function getRecordCount() external view returns (uint256);
```

Recommended event:

```solidity
event DigestRecorded(
    uint256 indexed recordId,
    bytes32 indexed digest,
    string messageRef,
    uint256 timestamp,
    address indexed recorder
);
```

Do not store plaintext messages on-chain.  
Do not store ciphertext bodies on-chain.  
Only store the digest and minimal proof metadata.

---

## Smart Contract Storage Model

Use:

```solidity
struct Record {
    bytes32 digest;
    string messageRef;
    uint256 timestamp;
    address recorder;
}
```

Use:

```solidity
mapping(uint256 => Record) private records;
uint256 private recordCount;
```

---

## Remix Contract Checks

Use Remix to compile and manually check:

1. Contract deployment.
2. Recording a valid digest.
3. Rejecting `bytes32(0)`.
4. Returning the correct digest.
5. Returning the correct message reference.
6. Returning a non-zero timestamp.
7. Returning the recorder address.
8. Emitting `DigestRecorded`.
9. Incrementing record count after each record.

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

## Digest Recording Script

Create:

```text
blockchain/scripts/recordDigest.js
```

The script should:

1. Accept an encrypted message envelope as input.
2. Canonicalise the envelope.
3. Compute `keccak256` of the canonical JSON string.
4. Call `recordDigest(bytes32 digest, string messageRef)` on the deployed contract.
5. Wait for transaction confirmation.
6. Extract `recordId` from the emitted event.
7. Return a blockchain proof object.

Proof object format:

```json
{
  "digest": "0x...",
  "record_id": 1,
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "message_ref": "1",
  "recorded_at": 1716200000
}
```

---

## Backend Integration Required From Person 2

Person 2 must provide the backend data and endpoints needed for automatic verification.

### 1. Message response fields

When a direct message is created, the backend should return:

```json
{
  "id": 1,
  "sender_id": 1,
  "recipient_id": 2,
  "ciphertext": "<base64>",
  "ratchet_header_enc": "<base64>",
  "sent_at": 1716200000
}
```

These fields are needed to build the encrypted message envelope.

### 2. Blockchain proof storage fields

Person 2 should add these fields to the message table or a related proof table:

```text
message_id
blockchain_digest
blockchain_record_id
blockchain_tx_hash
blockchain_contract_address
blockchain_chain_name
blockchain_chain_id
blockchain_recorded_at
```

### 3. Store blockchain proof endpoint

```text
POST /api/v1/messages/{message_id}/blockchain-record
```

Request body:

```json
{
  "digest": "0x...",
  "record_id": 1,
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "recorded_at": 1716200000
}
```

Expected response:

```json
{
  "message_id": 1,
  "status": "recorded"
}
```

### 4. Fetch blockchain proof endpoint

```text
GET /api/v1/messages/{message_id}/blockchain-record
```

Expected response:

```json
{
  "message_id": 1,
  "digest": "0x...",
  "record_id": 1,
  "transaction_hash": "0x...",
  "contract_address": "0x...",
  "chain_name": "sepolia",
  "chain_id": 11155111,
  "recorded_at": 1716200000
}
```

### 5. Fetch encrypted envelope endpoint

```text
GET /api/v1/messages/{message_id}/envelope
```

Expected response:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
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

---

## What Person 2 Needs From Person 3

Provide Person 2 with:

1. Smart contract address.
2. Smart contract ABI.
3. Sepolia chain ID.
4. Exact envelope format.
5. Exact canonicalisation rule.
6. Exact digest computation rule.
7. Proof object format.
8. Backend request body for storing blockchain proof.
9. Example valid proof object.

Digest rule to share:

```text
blockchain_digest = keccak256(utf8Bytes(canonical_json_of_encrypted_message_envelope))
```

---

## Frontend / C++ Client Integration Required From Person 1

Person 1 should add blockchain proof support to the message UI/client.

### After sending a message

The app should show:

```text
Message sent successfully.
Message ID: 1
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

Optional query parameter:

```text
backendBaseUrl
```

Example:

```text
verification-page/index.html?messageId=1&recordId=1&contract=0x123...&backendBaseUrl=https://team.theburkenator.com/api/v1
```

### Optional export button

Person 1 may add an optional debug button:

```text
[Export Proof JSON]
```

This is not the main verification flow.

---

## What Person 1 Needs From Person 3

Provide Person 1 with:

1. Verification page path or URL.
2. Required query parameters.
3. Contract address.
4. Example record ID.
5. Example message ID.
6. Example verification URL.
7. Short explanation of what the Verify button does.

Example explanation:

```text
The Verify Message button opens the verification page with the message ID and blockchain record ID. The page then fetches the encrypted envelope and blockchain proof automatically and shows PASS or FAIL.
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
3. Fetch blockchain proof from:
   GET /api/v1/messages/{messageId}/blockchain-record
4. Canonicalise the envelope.
5. Compute local keccak256 digest.
6. Connect to Sepolia using ethers.js.
7. Call getRecord(recordId) on the smart contract.
8. Compare local digest with on-chain digest.
9. Compare backend-stored digest with on-chain digest.
10. Display PASS or FAIL.
```

### Display fields

Show:

```text
Message ID
Record ID
Transaction hash
Contract address
Chain name
Canonical JSON
Locally computed digest
Backend stored digest
On-chain digest
Blockchain timestamp
Recorder wallet address
Verification result
```

### Result rules

```text
PASS:
- local digest matches on-chain digest
- backend stored digest matches on-chain digest
- messageRef from contract matches messageId

FAIL:
- local digest does not match on-chain digest
- backend stored digest does not match on-chain digest
- messageRef does not match messageId
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

### `fetchBackendProof(messageId, backendBaseUrl)`

Calls:

```text
GET /api/v1/messages/{messageId}/blockchain-record
```

Returns the backend-stored blockchain proof.

### `canonicaliseEnvelope(envelope)`

- Keeps only required fields.
- Sorts keys alphabetically.
- Converts IDs to strings.
- Keeps `sent_at` as number.
- Returns compact JSON string.

### `computeEnvelopeDigest(envelope)`

- Calls `canonicaliseEnvelope(envelope)`.
- Computes `keccak256(utf8Bytes(canonicalJson))`.
- Returns digest.

### `getContract(contractAddress)`

- Connects to Sepolia using `ethers.js`.
- Loads the contract ABI.
- Returns contract instance.

### `fetchOnChainRecord(contractAddress, recordId)`

- Calls `getRecord(recordId)`.
- Returns digest, messageRef, timestamp, and recorder address.

### `verifyMessageAutomatically()`

- Reads URL parameters.
- Fetches envelope.
- Fetches backend proof.
- Computes local digest.
- Fetches on-chain record.
- Compares values.
- Displays PASS or FAIL.

### `displayResult(result)`

Displays all verification details clearly.

---

## End-to-End Automatic Blockchain Flow

```text
1. Person 1 sends encrypted message through backend.
2. Person 2 backend stores ciphertext and returns message data.
3. Blockchain script builds canonical encrypted envelope.
4. Blockchain script computes keccak256 digest.
5. Blockchain script records digest on Sepolia.
6. Contract emits DigestRecorded event.
7. Blockchain script extracts record ID and transaction hash.
8. Blockchain proof is sent to Person 2 backend.
9. Backend stores blockchain proof against the message ID.
10. Person 1 displays transaction hash, record ID, and Verify Message button.
11. User clicks Verify Message.
12. Verification page fetches encrypted envelope from backend.
13. Verification page fetches backend blockchain proof.
14. Verification page fetches on-chain digest from Sepolia.
15. Verification page recomputes digest locally.
16. Verification page displays PASS or FAIL.
```

---

## Files To Produce

Blockchain files:

```text
blockchain/contracts/MessageIntegrity.sol
blockchain/scripts/recordDigest.js
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
3. Why users do not manually paste envelopes in the normal flow.
4. Canonical envelope format.
5. Digest computation rule.
6. Smart contract address.
7. ABI location.
8. Sepolia deployment transaction hash.
9. Automatic verification flow.
10. What is stored on-chain.
11. What is not stored on-chain.
12. Limitations.

Important limitation:

```text
The blockchain proves that a specific encrypted envelope digest was recorded at a certain time. It does not reveal or verify plaintext message meaning, and it does not stop the server from refusing to deliver messages.
```

---

## Implementation Order

1. Create the blockchain folder structure.
2. Implement `MessageIntegrity.sol`.
3. Compile the contract in Remix.
4. Use Remix to run the contract checks listed above.
5. Deploy to Sepolia using Remix and MetaMask.
6. Save contract address, ABI, and deployment transaction hash.
7. Implement envelope canonicalisation.
8. Implement digest computation.
9. Implement `recordDigest.js`.
10. Test recording one sample envelope on Sepolia.
11. Ask Person 2 for backend envelope/proof endpoints.
12. Ask Person 1 for Verify Message button support.
13. Build automatic verification page.
14. Test automatic PASS with unchanged envelope.
15. Test automatic FAIL after changing ciphertext or timestamp.
16. Store blockchain proof in backend.
17. Display record ID, transaction hash, and Verify Message link in frontend/client.

---

## Sample Test Envelope

Use this before backend integration:

```json
{
  "schema_version": "securemsg-envelope-v1",
  "message_type": "direct",
  "message_id": "1",
  "sender_id": "1",
  "recipient_id": "2",
  "ciphertext": "VGhpcyBpcyBhIHRlc3QgY2lwaGVydGV4dA==",
  "ratchet_header_enc": "VGhpcyBpcyBhIHRlc3QgcmF0Y2hldCBoZWFkZXI=",
  "sent_at": 1716200000
}
```

Expected behaviour:

```text
Original envelope → verification PASS
Change ciphertext → verification FAIL
Change recipient_id → verification FAIL
Change sent_at → verification FAIL
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
backend database design beyond blockchain proof fields
manual envelope paste as the main user flow
```
