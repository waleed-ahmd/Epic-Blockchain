import {
  ActionRow,
  BatchPanel,
  BatchTextArea,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  PrimaryButton,
  SecondaryButton,
} from "./MessageBatchPanel.styles";

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
    <BatchPanel>
      <PanelHeader>
        <div>
          <PanelTitle>Message batch</PanelTitle>
          <PanelDescription>
            Use message index, sender_public_key, and ciphertext.
          </PanelDescription>
        </div>
      </PanelHeader>
      <BatchTextArea
        value={batchJson}
        onChange={(event) => onBatchJsonChange(event.target.value)}
        placeholder='{"messages":[{"index":0,"sender_public_key":"...","ciphertext":"..."}]}'
        spellCheck={false}
      />
      <ActionRow>
        <PrimaryButton type="button" onClick={onVerify} disabled={busy}>
          {busy ? "Verifying..." : "Verify"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClear}>
          Clear
        </SecondaryButton>
      </ActionRow>
    </BatchPanel>
  );
}
