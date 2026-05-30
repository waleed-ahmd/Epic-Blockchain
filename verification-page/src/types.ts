export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type MessageForVerification = {
  index: number;
  sender_public_key: string;
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

export type VerificationOutput = {
  ok: boolean;
  statusMessage: string;
  computedMessagesHash?: string;
  onChainRecord?: OnChainRecord;
};
