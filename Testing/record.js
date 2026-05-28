"use strict";

/**
 * SecureMsg Segment Recorder Logic
 *
 * Developer/demo utility:
 * - accepts encrypted message envelopes up to the configured segment limit
 * - builds one segment hash from envelope hashes
 * - records the signed segment hash on Sepolia
 * - generates proof packages for verification-page/verification.html
 */

let latestEnvelopes = null;
let latestSegmentDigest = null;
let latestChainProof = null;
let latestProofPackages = null;

function getMaxSegmentEnvelopes() {
  return SecureMsgDigest.MAX_SEGMENT_ENVELOPES;
}

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

function resetDigestOutputs() {
  displayText("segmentHashOutput", "Not built yet.");
  displayText("messageCountOutput", "Not built yet.");
  displayText("envelopeHashesOutput", "Not built yet.");
  displayText("segmentHashListOutput", "Not built yet.");
  displayText("canonicalEnvelopesOutput", "Not built yet.");
  displayText("chainProofOutput", "No blockchain proof yet.");
  displayText("proofPackagesOutput", "No proof packages yet.");

  getElement("recordButton").disabled = true;
  getElement("copyProofPackagesButton").disabled = true;

  latestEnvelopes = null;
  latestSegmentDigest = null;
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

  const maxSegmentEnvelopes = getMaxSegmentEnvelopes();

  if (parsed.length < 1 || parsed.length > maxSegmentEnvelopes) {
    throw new Error(
      `A segment must contain between 1 and ${maxSegmentEnvelopes} envelopes.`
    );
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

  getElement("segmentRef").value = "direct-1-2-local-seg-1";
  getElement("envelopesInput").value = JSON.stringify(sample, null, 2);

  resetDigestOutputs();
  setStatus("localStatus", "Sample envelopes loaded.", "success");
  setStatus("recordStatus", "", "success");
}

function clearPage() {
  getElement("envelopesInput").value = "";
  resetDigestOutputs();
  setStatus("localStatus", "", "success");
  setStatus("recordStatus", "", "success");
}

function buildSegmentHash() {
  try {
    setStatus("localStatus", "Building segment hash...", "success");
    setStatus("recordStatus", "", "success");

    const envelopes = readEnvelopeArrayFromInput();

    const segmentDigest = SecureMsgDigest.buildSegmentDigest(envelopes);

    latestEnvelopes = envelopes;
    latestSegmentDigest = segmentDigest;
    latestChainProof = null;
    latestProofPackages = null;

    displayText("segmentHashOutput", segmentDigest.segmentHash);
    displayText("messageCountOutput", String(segmentDigest.messageCount));
    displayJson("envelopeHashesOutput", segmentDigest.envelopeHashes);
    displayJson("segmentHashListOutput", segmentDigest.allEnvelopeHashes);
    displayJson("canonicalEnvelopesOutput", segmentDigest.canonicalJsonList);
    displayText("chainProofOutput", "No blockchain proof yet.");
    displayText("proofPackagesOutput", "Record on Sepolia first to generate proof packages.");

    getElement("recordButton").disabled = false;
    getElement("copyProofPackagesButton").disabled = true;

    setStatus(
      "localStatus",
      "Segment hash built successfully.",
      "success"
    );
  } catch (error) {
    resetDigestOutputs();
    setStatus("localStatus", error.message, "error");
  }
}

function createProofPackages(envelopes, segmentDigest, chainProof, segmentRef) {
  return envelopes.map((envelope, index) => {
    const messageId = String(envelope.message_id);

    if (!segmentDigest.envelopeHashes[messageId]) {
      throw new Error(`Missing envelope hash for message_id ${messageId}`);
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
        segment_hash: segmentDigest.segmentHash,
        envelope_hash: segmentDigest.envelopeHashes[messageId],
        segment_hashes: segmentDigest.allEnvelopeHashes,
        recorded_timestamp: chainProof.recorded_timestamp,
        recorder: chainProof.recorder
      }
    };
  });
}

async function recordOnSepolia() {
  try {
    if (!latestSegmentDigest || !latestEnvelopes) {
      throw new Error("Build the segment hash before recording.");
    }

    const contractAddress = getElement("contractAddress").value.trim();
    const segmentRef = getElement("segmentRef").value.trim();

    if (!contractAddress) {
      throw new Error("Contract address is required.");
    }

    if (!segmentRef) {
      throw new Error("Segment reference is required.");
    }

    setStatus(
      "recordStatus",
      "Waiting for MetaMask confirmation and Sepolia transaction...",
      "warning"
    );

    const chainProof = await SecureMsgBlockchain.recordSegmentHash({
      contractAddress,
      segmentHash: latestSegmentDigest.segmentHash
    });

    latestChainProof = chainProof;

    const proofPackages = createProofPackages(
      latestEnvelopes,
      latestSegmentDigest,
      latestChainProof,
      segmentRef
    );

    latestProofPackages = proofPackages;

    displayJson("chainProofOutput", chainProof);
    displayJson("proofPackagesOutput", proofPackages);

    getElement("copyProofPackagesButton").disabled = false;

    setStatus(
      "recordStatus",
      "Segment hash recorded on Sepolia and proof packages generated.",
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
  getElement("buildRootButton").addEventListener("click", buildSegmentHash);
  getElement("recordButton").addEventListener("click", recordOnSepolia);
  getElement("copyProofPackagesButton").addEventListener("click", copyProofPackages);

  loadSampleEnvelopes();

  if (SecureMsgBlockchain.EXPECTED_CONTRACT_ADDRESS) {
    getElement("contractAddress").value =
      SecureMsgBlockchain.EXPECTED_CONTRACT_ADDRESS;
  }
}

initialisePage();
