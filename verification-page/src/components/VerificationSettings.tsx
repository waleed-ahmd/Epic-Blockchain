import {
  RpcInput,
  SettingsContainer,
  SettingsGrid,
  SettingsLabel,
  SettingsSummary,
} from "./VerificationSettings.styles";

type VerificationSettingsProps = {
  rpcUrl: string;
  onRpcUrlChange: (value: string) => void;
};

export function VerificationSettings({ rpcUrl, onRpcUrlChange }: VerificationSettingsProps) {
  return (
    <SettingsContainer>
      <SettingsSummary>Verification settings</SettingsSummary>
      <SettingsGrid>
        <SettingsLabel>
          RPC URL
          <RpcInput value={rpcUrl} onChange={(event) => onRpcUrlChange(event.target.value)} />
        </SettingsLabel>
      </SettingsGrid>
    </SettingsContainer>
  );
}
