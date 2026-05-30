type VerificationSettingsProps = {
  rpcUrl: string;
  onRpcUrlChange: (value: string) => void;
};

export function VerificationSettings({ rpcUrl, onRpcUrlChange }: VerificationSettingsProps) {
  return (
    <details className="settings">
      <summary>Verification settings</summary>
      <div className="settings-grid">
        <label>
          RPC URL
          <input value={rpcUrl} onChange={(event) => onRpcUrlChange(event.target.value)} />
        </label>
      </div>
    </details>
  );
}
