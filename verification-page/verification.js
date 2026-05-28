"use strict";

/**
 * SecureMsg Verification Page Logic
 *
 * Production-style verification:
 * - The proof package is provided by the client.
 * - This page verifies the proof package against the on-chain Sepolia digest.
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
  displayText("envelopeHashOutput", "Not computed yet.");
  displayText("segmentHashOutput", "Not checked yet.");
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

  if (!proof.contract_address || !ethers.isAddress(proof.contract_address)) {
    throw new Error("proof.contract_address is missing or invalid.");
  }

  SecureMsgBlockchain.validateConfiguredContractAddress(proof.contract_address);

  if (!proof.segment_hash || !ethers.isHexString(proof.segment_hash, 32)) {
    throw new Error("proof.segment_hash is missing or invalid.");
  }

  if (proof.envelope_hash && !ethers.isHexString(proof.envelope_hash, 32)) {
    throw new Error("proof.envelope_hash must be a bytes32 hex string.");
  }

  if (!Array.isArray(proof.segment_hashes)) {
    throw new Error("proof.segment_hashes must be an array.");
  }

  if (!Number.isInteger(Number(proof.segment_index)) || Number(proof.segment_index) < 0) {
    throw new Error("proof.segment_index is missing or invalid.");
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
    displayText("envelopeHashOutput", "Computing...");
    displayText("segmentHashOutput", "Checking...");
    displayText("onChainOutput", "Loading...");

    const packageData = parseProofPackageInput();
    validateProofPackage(packageData);

    const envelope = packageData.envelope;
    const proof = packageData.proof;

    displayJson("envelopeOutput", envelope);
    displayJson("proofOutput", proof);

    const canonicalJson = SecureMsgDigest.canonicaliseEnvelope(envelope);
    const computedEnvelopeHash = SecureMsgDigest.computeEnvelopeHash(envelope);

    displayText("canonicalOutput", canonicalJson);
    displayText("envelopeHashOutput", computedEnvelopeHash);

    if (
      proof.envelope_hash &&
      computedEnvelopeHash.toLowerCase() !== String(proof.envelope_hash).toLowerCase()
    ) {
      displayJson("segmentHashOutput", {
        computed_envelope_hash: computedEnvelopeHash,
        proof_envelope_hash: proof.envelope_hash,
        envelope_hash_match: false
      });

      setFinalResult(
        "FAIL — The local envelope hash does not match the proof package envelope hash.",
        "fail"
      );

      setStatus("Verification failed at envelope hash check.", "error");
      return;
    }

    const segmentIndex = Number(proof.segment_index);
    const listedHash = proof.segment_hashes[segmentIndex];

    if (!listedHash || String(listedHash).toLowerCase() !== computedEnvelopeHash.toLowerCase()) {
      displayJson("segmentHashOutput", {
        computed_envelope_hash: computedEnvelopeHash,
        segment_index: segmentIndex,
        listed_hash_at_index: listedHash || null,
        hash_list_match: false
      });

      setFinalResult(
        "FAIL — The local envelope hash does not match the hash list at proof.segment_index.",
        "fail"
      );

      setStatus("Verification failed at segment hash list check.", "error");
      return;
    }

    const computedSegmentHash = SecureMsgDigest.computeSegmentHashFromEnvelopeHashes(
      proof.segment_hashes
    );

    displayJson("segmentHashOutput", {
      computed_envelope_hash: computedEnvelopeHash,
      proof_envelope_hash: proof.envelope_hash || null,
      segment_index: segmentIndex,
      computed_segment_hash: computedSegmentHash,
      proof_segment_hash: proof.segment_hash,
      segment_hash_valid: computedSegmentHash.toLowerCase() === String(proof.segment_hash).toLowerCase()
    });

    if (computedSegmentHash.toLowerCase() !== String(proof.segment_hash).toLowerCase()) {
      setFinalResult(
        "FAIL — The encrypted envelope hash list does not rebuild the proof package segment hash.",
        "fail"
      );

      setStatus("Verification failed at segment hash check.", "error");
      return;
    }

    const onChainRecord = await SecureMsgBlockchain.fetchSegmentRecord(
      proof.contract_address,
      proof.segment_hash
    );

    displayJson("onChainOutput", onChainRecord);

    if (!onChainRecord.recorded) {
      setFinalResult(
        "FAIL — The proof package segment hash has not been recorded on Sepolia.",
        "fail"
      );

      setStatus("Verification failed at on-chain record lookup.", "error");
      return;
    }

    if (
      proof.recorded_timestamp &&
      Number(proof.recorded_timestamp) !== Number(onChainRecord.timestamp)
    ) {
      setFinalResult(
        "FAIL — Proof timestamp does not match the Sepolia blockchain record.",
        "fail"
      );

      setStatus("Verification failed at timestamp comparison.", "error");
      return;
    }

    if (
      proof.recorder &&
      ethers.getAddress(proof.recorder) !== ethers.getAddress(onChainRecord.recorder)
    ) {
      setFinalResult(
        "FAIL — Proof recorder does not match the Sepolia blockchain record.",
        "fail"
      );

      setStatus("Verification failed at recorder comparison.", "error");
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
