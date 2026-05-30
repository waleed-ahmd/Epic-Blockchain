export type MessageForVerification = {
  /** Used only to sort the batch in ascending order before hashing. */
  message_id: number;

  /** Binds the encrypted message to the sender key without relying on a mutable display name. */
  sender_public_key: string;

  /** The encrypted message content committed into the batch hash. */
  ciphertext: string;
};

export type MessageBatchInput = {
  messages: MessageForVerification[];
};

export type OnChainRecord = {
  messages_hash: string;
  recorder: string;
  timestamp: number;
};

type VerificationBase = {
  statusMessage: string;
  canonicalMessages?: string[];
  computedMessageHashes?: string[];
  computedMessagesHash?: string;
};

export type VerificationSuccess = VerificationBase & {
  ok: true;
  onChainRecord: OnChainRecord;
};

export type VerificationFailure = VerificationBase & {
  ok: false;
  onChainRecord?: never;
};

export type VerificationOutput = VerificationSuccess | VerificationFailure;
