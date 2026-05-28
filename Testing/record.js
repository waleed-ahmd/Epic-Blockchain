"use strict";

/**
 * SecureMsg Segment Recorder Logic
 *
 * Developer/demo utility:
 * - accepts 1 to 5 encrypted message envelopes
 * - builds Merkle root and proofs
 * - records segment root on Sepolia
 * - generates proof packages for verification-page/verification.html
 */

let latestEnvelopes = null;
let latestSegmentProof = null;
let latestChainProof = null;
let latestProofPackages = null;

function getElement(id) {
  return document.getElementById(id);
}

function displayJson(elementId, value) {
  getElement(elementId).textContent = JSON.stringify(value, null, 2);
}

function displayText(elementId, value) {
  getElement(elementId).textContent = value;
}

function setStatus(elementId, message, type = "success") {
  const element = getElement(elementId);
  element.textContent = message;
  element.className = `status-text ${type}`;
}

function resetMerkleOutputs() {
  displayText("segmentRootOutput", "Not built yet.");
  displayText("messageCountOutput", "Not built yet.");
  displayText("leafHashesOutput", "Not built yet.");
  displayText("messageProofsOutput", "Not built yet.");
  displayText("treeOutput", "Not built yet.");
  displayText("chainProofOutput", "No blockchain proof yet.");
  displayText("proofPackagesOutput", "No proof packages yet.");

  getElement("recordButton").disabled = true;
  getElement("copyProofPackagesButton").disabled = true;

  latestEnvelopes = null;
  latestSegmentProof = null;
  latestChainProof = null;
  latestProofPackages = null;
}

function readEnvelopeArrayFromInput() {
  const raw = getElement("envelopesInput").value.trim();

  if (!raw) {
    throw new Error("Please paste a JSON array of encrypted envelopes.");
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("Envelope input is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Envelope input must be a JSON array.");
  }

  if (parsed.length < 1 || parsed.length > 5) {
    throw new Error("A segment must contain between 1 and 5 envelopes.");
  }

  return parsed;
}

function loadSampleEnvelopes() {
  const sample = [
    {
      schema_version: "securemsg-envelope-v1",
      message_type: "direct",
      conversation_id: "direct-1-2",
      message_id: "1",
      sender_id: "1",
      recipient_id: "2",
      ciphertext: "VGhpcyBpcyBhIHRlc3QgY2lwaGVydGV4dA==",
      ratchet_header_enc: "VGhpcyBpcyBhIHRlc3QgcmF0Y2hldCBoZWFkZXI="
    },
    {
      schema_version: "securemsg-envelope-v1",
      message_type: "direct",
      conversation_id: "direct-1-2",
      message_id: "2",
      sender_id: "2",
      recipient_id: "1",
      ciphertext: "U2Vjb25kIHRlc3QgY2lwaGVydGV4dA==",
      ratchet_header_enc: "U2Vjb25kIHRlc3QgcmF0Y2hldCBoZWFkZXI="
    },
    {
      schema_version: "securemsg-envelope-v1",
      message_type: "direct",
      conversation_id: "direct-1-2",
      message_id: "3",
      sender_id: "1",
      recipient_id: "2",
      ciphertext: "VGhpcmQgdGVzdCBjaXBoZXJ0ZXh0",
      ratchet_header_enc: "VGhpcmQgdGVzdCByYXRjaGV0IGhlYWRlcg=="
    }
  ];

  getElement("conversationRef").value = "direct-1-2";
  getElement("segmentRef").value = "direct-1-2-local-seg-1";
  getElement("envelopesInput").value = JSON.stringify(sample, null, 2);

  resetMerkleOutputs();
  setStatus("localStatus", "Sample envelopes loaded.", "success");
  setStatus("recordStatus", "", "success");
}

function clearPage() {
  getElement("envelopesInput").value = "";
  resetMerkleOutputs();
  setStatus("localStatus", "", "success");
  setStatus("recordStatus", "", "success");
}

function buildMerkleRootAndProofs() {
  try {
    setStatus("localStatus", "Building Merkle root and proofs...", "success");
    setStatus("recordStatus", "", "success");

    const envelopes = readEnvelopeArrayFromInput();

    const segmentProof = SecureMsgMerkle.buildSegmentProof(envelopes);

    latestEnvelopes = envelopes;
    latestSegmentProof = segmentProof;
    latestChainProof = null;
    latestProofPackages = null;

    displayText("segmentRootOutput", segmentProof.segmentRoot);
    displayText("messageCountOutput", String(segmentProof.messageCount));
    displayJson("leafHashesOutput", segmentProof.leafHashes);
    displayJson("messageProofsOutput", segmentProof.messageProofs);
    displayJson("treeOutput", segmentProof.tree);
    displayText("chainProofOutput", "No blockchain proof yet.");
    displayText("proofPackagesOutput", "Record on Sepolia first to generate proof packages.");

    getElement("recordButton").disabled = false;
    getElement("copyProofPackagesButton").disabled = true;

    setStatus(
      "localStatus",
      "Merkle root and message proofs built successfully.",
      "success"
    );
  } catch (error) {
    resetMerkleOutputs();
    setStatus("localStatus", error.message, "error");
  }
}

function createProofPackages(envelopes, segmentProof, chainProof, segmentRef) {
  return envelopes.map((envelope, index) => {
    const messageId = String(envelope.message_id);

    if (!segmentProof.leafHashes[messageId]) {
      throw new Error(`Missing leaf hash for message_id ${messageId}`);
    }

    if (!segmentProof.messageProofs[messageId]) {
      throw new Error(`Missing Merkle proof for message_id ${messageId}`);
    }

    return {
      envelope,
      proof: {
        segment_id: segmentRef,
        segment_index: index,
        transaction_hash: chainProof.transaction_hash,
        contract_address: chainProof.contract_address,
        chain_name: chainProof.chain_name,
        chain_id: chainProof.chain_id,
        segment_root: segmentProof.segmentRoot,
        leaf_hash: segmentProof.leafHashes[messageId],
        recorded_timestamp: chainProof.recorded_timestamp,
        recorder: chainProof.recorder,
        merkle_proof: segmentProof.messageProofs[messageId]
      }
    };
  });
}

async function recordOnSepolia() {
  try {
    if (!latestSegmentProof || !latestEnvelopes) {
      throw new Error("Build the Merkle root before recording.");
    }

    const contractAddress = getElement("contractAddress").value.trim();
    const conversationRef = getElement("conversationRef").value.trim();
    const segmentRef = getElement("segmentRef").value.trim();

    if (!contractAddress) {
      throw new Error("Contract address is required.");
    }

    if (!conversationRef) {
      throw new Error("Conversation reference is required.");
    }

    if (!segmentRef) {
      throw new Error("Segment reference is required.");
    }

    setStatus(
      "recordStatus",
      "Waiting for MetaMask confirmation and Sepolia transaction...",
      "warning"
    );

    const chainProof = await SecureMsgBlockchain.recordSegmentRoot({
      contractAddress,
      segmentRoot: latestSegmentProof.segmentRoot,
      conversationRef,
      segmentRef,
      messageCount: latestSegmentProof.messageCount
    });

    latestChainProof = chainProof;

    const proofPackages = createProofPackages(
      latestEnvelopes,
      latestSegmentProof,
      latestChainProof,
      segmentRef
    );

    latestProofPackages = proofPackages;

    displayJson("chainProofOutput", chainProof);
    displayJson("proofPackagesOutput", proofPackages);

    getElement("copyProofPackagesButton").disabled = false;

    setStatus(
      "recordStatus",
      "Segment root recorded on Sepolia and proof packages generated.",
      "success"
    );
  } catch (error) {
    setStatus("recordStatus", error.message, "error");
  }
}

async function copyProofPackages() {
  try {
    if (!latestProofPackages) {
      throw new Error("No proof packages available to copy.");
    }

    const text = JSON.stringify(latestProofPackages, null, 2);
    await navigator.clipboard.writeText(text);

    setStatus("recordStatus", "Proof packages copied to clipboard.", "success");
  } catch (error) {
    setStatus("recordStatus", error.message, "error");
  }
}

function initialisePage() {
  getElement("loadSampleButton").addEventListener("click", loadSampleEnvelopes);
  getElement("clearButton").addEventListener("click", clearPage);
  getElement("buildRootButton").addEventListener("click", buildMerkleRootAndProofs);
  getElement("recordButton").addEventListener("click", recordOnSepolia);
  getElement("copyProofPackagesButton").addEventListener("click", copyProofPackages);

  loadSampleEnvelopes();

  if (SecureMsgBlockchain.EXPECTED_CONTRACT_ADDRESS) {
    getElement("contractAddress").value =
      SecureMsgBlockchain.EXPECTED_CONTRACT_ADDRESS;
  }
}

initialisePage();
