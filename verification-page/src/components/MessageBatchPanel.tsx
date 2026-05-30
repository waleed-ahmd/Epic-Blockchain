type MessageBatchPanelProps = {
  batchJson: string;
  busy: boolean;
  onBatchJsonChange: (value: string) => void;
  onVerify: () => void;
  onClear: () => void;
};

export function MessageBatchPanel({
  batchJson,
  busy,
  onBatchJsonChange,
  onVerify,
  onClear,
}: MessageBatchPanelProps) {
  return (
    <section className="panel batch-panel">
      <div className="panel-header">
        <div>
          <h2>Message batch</h2>
          <p>Use messages with message_id, sender_public_key, and ciphertext.</p>
        </div>
      </div>
      <textarea
        value={batchJson}
        onChange={(event) => onBatchJsonChange(event.target.value)}
        placeholder='{"messages":[{"message_id":1,"sender_public_key":"...","ciphertext":"..."}]}'
        spellCheck={false}
      />
      <div className="actions">
        <button type="button" onClick={onVerify} disabled={busy}>
          {busy ? "Verifying..." : "Verify"}
        </button>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
