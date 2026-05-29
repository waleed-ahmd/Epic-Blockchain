export type Envelope = {
  ciphertext: string;
  conversation_id: string;
  message_id: string | number;
  message_type: string;
  ratchet_header_enc: string;
  recipient_id: string | number;
  schema_version: string;
  sender_id: string | number;
};

export type NormalisedEnvelope = {
  ciphertext: string;
  conversation_id: string;
  message_id: string;
  message_type: string;
  ratchet_header_enc: string;
  recipient_id: string;
  schema_version: string;
  sender_id: string;
};

export type Proof = {
  segment_id?: string;
  segment_index: number;
  transaction_hash?: string;
  contract_address: string;
  chain_name?: string;
  chain_id: number;
  segment_hash: string;
  envelope_hash?: string;
  segment_hashes: string[];
  recorded_timestamp?: number;
  recorder?: string;
};

export type ProofPackage = {
  envelope: Envelope;
  proof: Proof;
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
  canonicalEnvelope?: string;
  computedEnvelopeHash?: string;
  computedSegmentHash?: string;
  onChainRecord?: OnChainRecord;
};
