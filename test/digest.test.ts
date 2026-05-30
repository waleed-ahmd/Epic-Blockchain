import { describe, expect, it } from "vitest";
import {
  canonicaliseEnvelope,
  computeEnvelopeHash,
  computeSegmentHashFromEnvelopes,
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
const olderEnvelope: Envelope = {
  ciphertext: "older-ciphertext",
  conversation_id: "direct-1-2",
  message_id: 3,
  ratchet_header_enc: "older-header",
  recipient_id: 2,
  schema_version: "securemsg-envelope-v1",
  sender_id: 1,
};
const olderEnvelopeHash = "0x90b8b00dd28da3e68bd0e7a4f5365f968b49c83471d48b41f2119d069614f50c";
const sortedBatchSegmentHash =
  "0x63e159c55de26d1765ddf95e0cda467b666537e143d104a9d626eb04dd1bedc2";

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

  it("sorts envelopes by message_id before computing the segment hash", () => {
    const result = computeSegmentHashFromEnvelopes([envelope, olderEnvelope]);

    expect(result.envelopeHashes).to.deep.equal([olderEnvelopeHash, envelopeHash]);
    expect(result.segmentHash).to.equal(sortedBatchSegmentHash);
  });

  it("rejects duplicate message ids in a segment", () => {
    expect(() => computeSegmentHashFromEnvelopes([envelope, envelope])).to.throw(
      "message_id values must be unique within a segment",
    );
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
