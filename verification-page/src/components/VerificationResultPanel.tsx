import type { JsonValue, VerificationOutput } from "../types";
import { JsonBlock } from "./JsonBlock";
import {
  OutputLabel,
  OutputSection,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  ResultMessage,
  ResultPanel,
  ResultStack,
} from "./VerificationResultPanel.styles";

const OUTPUT_SECTIONS: Array<{
  label: string;
  getValue: (result?: VerificationOutput) => JsonValue | undefined;
}> = [
  { label: "Messages hash", getValue: (result) => result?.computedMessagesHash },
  {
    label: "On-chain record",
    getValue: (result) =>
      result?.onChainRecord
        ? {
            messages_hash: result.onChainRecord.messages_hash,
            recorder: result.onChainRecord.recorder,
            timestamp: result.onChainRecord.timestamp,
          }
        : undefined,
  },
];

type VerificationResultPanelProps = {
  result?: VerificationOutput;
};

function getResultState(result?: VerificationOutput) {
  if (!result) {
    return "idle";
  }

  return result.ok ? "pass" : "fail";
}

export function VerificationResultPanel({ result }: VerificationResultPanelProps) {
  return (
    <ResultPanel>
      <PanelHeader>
        <div>
          <PanelTitle>Verification result</PanelTitle>
          <PanelDescription>
            The local messages_hash is compared with the Sepolia record.
          </PanelDescription>
        </div>
      </PanelHeader>
      <ResultMessage $state={getResultState(result)}>
        {result?.statusMessage || "Waiting for message batch."}
      </ResultMessage>
      <ResultStack>
        {OUTPUT_SECTIONS.map((section) => (
          <OutputSection key={section.label}>
            <OutputLabel>{section.label}</OutputLabel>
            <JsonBlock value={section.getValue(result)} />
          </OutputSection>
        ))}
      </ResultStack>
    </ResultPanel>
  );
}
