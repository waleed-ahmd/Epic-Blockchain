export type Envelope = {
  ciphertext: string;
  conversation_id: string;
  message_id: string | number;
  ratchet_header_enc: string;
  recipient_id: string | number;
  schema_version: string;
  sender_id: string | number;
};

export type NormalisedEnvelope = {
  ciphertext: string;
  conversation_id: string;
  message_id: string;
  ratchet_header_enc: string;
  recipient_id: string;
  schema_version: string;
  sender_id: string;
};

export type MessageBatchInput = {
  envelopes: Envelope[];
};

export type OnChainRecord = {
  segment_hash: string;
  recorder: string;
  timestamp: number;
  recorded: boolean;
};

export type VerificationOutput = {
  ok: boolean;
  message: string;
  canonicalEnvelopes?: string[];
  computedEnvelopeHashes?: string[];
  computedSegmentHash?: string;
  onChainRecord?: OnChainRecord;
};
