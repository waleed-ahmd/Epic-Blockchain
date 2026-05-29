import { describe, expect, it } from "vitest";
import {
  canonicaliseEnvelope,
  computeEnvelopeHash,
  computeSegmentHashFromEnvelopeHashes,
} from "../verification-page/src/digest";
import type { Envelope } from "../verification-page/src/types";

const envelope: Envelope = {
  ciphertext: "ciphertext-base64",
  conversation_id: "direct-1-2",
  message_id: 7,
  ratchet_header_enc: "header-base64",
  recipient_id: 2,
  schema_version: "securemsg-envelope-v1",
  sender_id: 1,
};

const canonicalEnvelope =
  '{"ciphertext":"ciphertext-base64","conversation_id":"direct-1-2","message_id":"7","ratchet_header_enc":"header-base64","recipient_id":"2","schema_version":"securemsg-envelope-v1","sender_id":"1"}';

const envelopeHash = "0x6a8c5f7af40f9a35ee4d36c03b57d6e26b1597a789133707a10736306d9ed70f";
const segmentHash = "0x172d2b4547aa5f7b7ba88889b824ee060e840be8c5d7e1326d5df4c4fc8bd205";

describe("digest helpers", () => {
  it("canonicalises envelopes in the exact client integration order", () => {
    expect(canonicaliseEnvelope(envelope)).to.equal(canonicalEnvelope);
  });

  it("computes the expected envelope hash", () => {
    expect(computeEnvelopeHash(envelope)).to.equal(envelopeHash);
  });

  it("computes the expected segment hash from raw envelope hashes", () => {
    expect(computeSegmentHashFromEnvelopeHashes([envelopeHash])).to.equal(segmentHash);
  });

  it("rejects invalid segment hash lists", () => {
    expect(() => computeSegmentHashFromEnvelopeHashes([])).to.throw(
      "At least one envelope hash is required",
    );
    expect(() => computeSegmentHashFromEnvelopeHashes([envelopeHash, envelopeHash, envelopeHash, envelopeHash, envelopeHash, envelopeHash])).to.throw(
      "A segment cannot contain more than 5 envelope hashes",
    );
    expect(() => computeSegmentHashFromEnvelopeHashes(["0x1234"])).to.throw(
      "All envelope hashes must be bytes32 hex strings",
    );
  });
});
