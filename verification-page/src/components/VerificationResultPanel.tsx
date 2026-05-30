import type { VerificationOutput } from "../types";
import { JsonBlock } from "./JsonBlock";

const OUTPUT_SECTIONS: Array<{
  label: string;
  getValue: (result: VerificationOutput | null) => unknown;
}> = [
  { label: "Message hashes", getValue: (result) => result?.computedMessageHashes },
  { label: "Messages hash", getValue: (result) => result?.computedMessagesHash },
  { label: "On-chain record", getValue: (result) => result?.onChainRecord },
  { label: "Canonical messages", getValue: (result) => result?.canonicalMessages },
];

type VerificationResultPanelProps = {
  result: VerificationOutput | null;
};

export function VerificationResultPanel({ result }: VerificationResultPanelProps) {
  return (
    <section className="panel result-panel">
      <div className="panel-header">
        <div>
          <h2>Verification result</h2>
          <p>The local hash is compared with the Sepolia record.</p>
        </div>
      </div>
      <div className={`result ${result?.ok ? "pass" : result ? "fail" : ""}`}>
        {result?.statusMessage || "Waiting for message batch."}
      </div>
      <div className="result-stack">
        {OUTPUT_SECTIONS.map((section) => (
          <section key={section.label}>
            <h3>{section.label}</h3>
            <JsonBlock value={section.getValue(result)} />
          </section>
        ))}
      </div>
    </section>
  );
}
