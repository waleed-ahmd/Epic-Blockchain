"use strict";

/**
 * SecureMsg Verification Page Logic
 *
 * Production-style verification:
 * - The proof package is provided by the client.
 * - This page verifies the proof package against the on-chain Sepolia root.
 * - It does not fetch envelope/proof from backend.
 * - It does not include sample/test proof data.
 */

function getElement(id) {
  return document.getElementById(id);
}

function displayJson(elementId, value) {
  getElement(elementId).textContent = JSON.stringify(value, null, 2);
}

function displayText(elementId, value) {
  getElement(elementId).textContent = value;
}

function setStatus(message, type = "success") {
  const element = getElement("statusOutput");
  element.textContent = message;
  element.className = `status-text ${type}`;
}

function setFinalResult(message, type = "neutral") {
  const element = getElement("finalResult");
  element.textContent = message;
  element.className = `result-box ${type}`;
}

function resetOutputs() {
  displayText("envelopeOutput", "Not loaded yet.");
  displayText("proofOutput", "Not loaded yet.");
  displayText("canonicalOutput", "Not computed yet.");
  displayText("leafHashOutput", "Not computed yet.");
  displayText("merkleProofOutput", "Not checked yet.");
  displayText("onChainOutput", "Not loaded yet.");
  setFinalResult("Not verified yet.", "neutral");
  setStatus("", "success");
}

function parseProofPackageInput() {
  const raw = getElement("proofPackageInput").value.trim();

  if (!raw) {
    throw new Error("Proof package JSON is required.");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON. Please provide a valid proof package.");
  }
}

function validateProofPackage(packageData) {
  if (!packageData || typeof packageData !== "object" || Array.isArray(packageData)) {
    throw new Error("Proof package must be a JSON object.");
  }

  if (!packageData.envelope || typeof packageData.envelope !== "object") {
    throw new Error("Proof package must contain an envelope object.");
  }

  if (!packageData.proof || typeof packageData.proof !== "object") {
    throw new Error("Proof package must contain a proof object.");
  }

  const proof = packageData.proof;

  if (!Number.isInteger(Number(proof.record_id)) || Number(proof.record_id) <= 0) {
    throw new Error("proof.record_id is missing or invalid.");
  }

  if (!proof.contract_address || !ethers.isAddress(proof.contract_address)) {
    throw new Error("proof.contract_address is missing or invalid.");
  }

  SecureMsgBlockchain.validateConfiguredContractAddress(proof.contract_address);

  if (!proof.segment_root || !ethers.isHexString(proof.segment_root, 32)) {
    throw new Error("proof.segment_root is missing or invalid.");
  }

  if (proof.leaf_hash && !ethers.isHexString(proof.leaf_hash, 32)) {
    throw new Error("proof.leaf_hash must be a bytes32 hex string.");
  }

  if (!Array.isArray(proof.merkle_proof)) {
    throw new Error("proof.merkle_proof must be an array.");
  }

  if (Number(proof.chain_id) !== SecureMsgBlockchain.SEPOLIA_CHAIN_ID_DECIMAL) {
    throw new Error(
      `proof.chain_id must be Sepolia chain ID ${SecureMsgBlockchain.SEPOLIA_CHAIN_ID_DECIMAL}.`
    );
  }
}

function clearPage() {
  getElement("proofPackageInput").value = "";
  resetOutputs();
}

async function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();

    // Validate JSON before placing it in the textarea.
    JSON.parse(text);

    getElement("proofPackageInput").value = text;
    resetOutputs();
    setStatus("Proof package file loaded.", "success");
  } catch (error) {
    setFinalResult(`FAIL — ${error.message}`, "fail");
    setStatus("Uploaded file is not valid JSON.", "error");
  } finally {
    event.target.value = "";
  }
}

async function verifyProofPackage() {
  try {
    setFinalResult("Verification in progress...", "neutral");
    setStatus("Starting verification...", "success");

    displayText("envelopeOutput", "Loading...");
    displayText("proofOutput", "Loading...");
    displayText("canonicalOutput", "Computing...");
    displayText("leafHashOutput", "Computing...");
    displayText("merkleProofOutput", "Checking...");
    displayText("onChainOutput", "Loading...");

    const packageData = parseProofPackageInput();
    validateProofPackage(packageData);

    const envelope = packageData.envelope;
    const proof = packageData.proof;

    displayJson("envelopeOutput", envelope);
    displayJson("proofOutput", proof);

    const canonicalJson = SecureMsgMerkle.canonicaliseEnvelope(envelope);
    const computedLeafHash = SecureMsgMerkle.computeEnvelopeHash(envelope);

    displayText("canonicalOutput", canonicalJson);
    displayText("leafHashOutput", computedLeafHash);

    if (
      proof.leaf_hash &&
      computedLeafHash.toLowerCase() !== String(proof.leaf_hash).toLowerCase()
    ) {
      displayJson("merkleProofOutput", {
        computed_leaf_hash: computedLeafHash,
        proof_leaf_hash: proof.leaf_hash,
        leaf_hash_match: false
      });

      setFinalResult(
        "FAIL — The local envelope hash does not match the proof package leaf hash.",
        "fail"
      );

      setStatus("Verification failed at leaf hash check.", "error");
      return;
    }

    const merkleProofValid = SecureMsgMerkle.verifyMerkleProof(
      computedLeafHash,
      proof.merkle_proof,
      proof.segment_root
    );

    displayJson("merkleProofOutput", {
      computed_leaf_hash: computedLeafHash,
      proof_leaf_hash: proof.leaf_hash || null,
      expected_segment_root_from_package: proof.segment_root,
      merkle_proof_valid: merkleProofValid
    });

    if (!merkleProofValid) {
      setFinalResult(
        "FAIL — The encrypted envelope does not match the Merkle proof.",
        "fail"
      );

      setStatus("Verification failed at Merkle proof step.", "error");
      return;
    }

    const onChainRecord = await SecureMsgBlockchain.fetchSegmentRecord(
      proof.contract_address,
      Number(proof.record_id)
    );

    displayJson("onChainOutput", onChainRecord);

    const packageRoot = String(proof.segment_root).toLowerCase();
    const onChainRoot = String(onChainRecord.segment_root).toLowerCase();

    if (packageRoot !== onChainRoot) {
      setFinalResult(
        "FAIL — The proof package segment root does not match the Sepolia blockchain record.",
        "fail"
      );

      setStatus("Verification failed at on-chain root comparison.", "error");
      return;
    }

    if (
      envelope.conversation_id &&
      onChainRecord.conversation_ref &&
      envelope.conversation_id !== onChainRecord.conversation_ref
    ) {
      setFinalResult(
        "FAIL — Envelope conversation_id does not match the on-chain conversation reference.",
        "fail"
      );

      setStatus("Verification failed at conversation reference check.", "error");
      return;
    }

    if (
      proof.segment_id &&
      onChainRecord.segment_ref &&
      proof.segment_id !== onChainRecord.segment_ref
    ) {
      setFinalResult(
        "FAIL — Proof segment_id does not match the on-chain segment reference.",
        "fail"
      );

      setStatus("Verification failed at segment reference check.", "error");
      return;
    }

    setFinalResult(
      "PASS — This encrypted message envelope belongs to the notarised segment and matches the Sepolia blockchain record.",
      "pass"
    );

    setStatus("Verification completed successfully.", "success");
  } catch (error) {
    setFinalResult(`FAIL — ${error.message}`, "fail");
    setStatus(error.message, "error");
  }
}

function initialisePage() {
  getElement("verifyButton").addEventListener("click", verifyProofPackage);
  getElement("clearButton").addEventListener("click", clearPage);
  getElement("proofFileInput").addEventListener("change", handleFileUpload);
}

initialisePage();
