import { useMemo, useState } from "react";
import { DEFAULT_SEPOLIA_RPC_URL } from "./blockchain";
import { parseMessageBatch, verifyMessageBatch } from "./verify";
import type { VerificationOutput } from "./types";
import "./styles.css";

const OUTPUT_SECTIONS: Array<{
  label: string;
  getValue: (result: VerificationOutput | null) => unknown;
}> = [
  { label: "Envelope hashes", getValue: (result) => result?.computedEnvelopeHashes },
  { label: "Segment hash", getValue: (result) => result?.computedSegmentHash },
  { label: "On-chain record", getValue: (result) => result?.onChainRecord },
  { label: "Canonical envelopes", getValue: (result) => result?.canonicalEnvelopes },
];

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => {
    if (!value) {
      return "Not available.";
    }

    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }, [value]);

  return <pre>{text}</pre>;
}

function Header({ status, result }: { status: string; result: VerificationOutput | null }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div>
          <strong>SecureMsg Verification</strong>
          <span>Sepolia integrity check</span>
        </div>
      </div>
      <div className={`status ${result?.ok ? "pass" : result ? "fail" : ""}`}>{status}</div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div>
        <strong>SecureMsg</strong>
        <span>Read-only blockchain integrity verifier</span>
      </div>
      <span>Network: Sepolia</span>
    </footer>
  );
}

export default function App() {
  const [batchJson, setBatchJson] = useState("");
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_SEPOLIA_RPC_URL);
  const [result, setResult] = useState<VerificationOutput | null>(null);
  const [status, setStatus] = useState("Not verified yet.");
  const [busy, setBusy] = useState(false);

  async function onVerify() {
    setBusy(true);
    setStatus("Verifying...");
    setResult(null);

    try {
      const packageData = parseMessageBatch(batchJson);
      const output = await verifyMessageBatch(packageData, rpcUrl);
      setResult(output);
      setStatus(output.ok ? "PASS" : "FAIL");
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Verification failed",
      });
      setStatus("FAIL");
    } finally {
      setBusy(false);
    }
  }

  function clearForm() {
    setBatchJson("");
    setResult(null);
    setStatus("Not verified yet.");
  }

  return (
    <main className="app">
      <Header status={status} result={result} />

      <div className="app-shell">
        <section className="page-title">
          <div>
            <h1>Verify message batch</h1>
            <p>Paste received message envelopes to rebuild the batch hash.</p>
          </div>
          <span className="network-pill">Sepolia</span>
        </section>

        <details className="settings">
          <summary>Verification settings</summary>
          <div className="settings-grid">
            <label>
              RPC URL
              <input value={rpcUrl} onChange={(event) => setRpcUrl(event.target.value)} />
            </label>
          </div>
        </details>

        <section className="workspace">
          <section className="panel batch-panel">
            <div className="panel-header">
              <div>
                <h2>Message batch</h2>
              </div>
            </div>
            <textarea
              value={batchJson}
              onChange={(event) => setBatchJson(event.target.value)}
              placeholder="Paste message envelopes JSON here"
              spellCheck={false}
            />
            <div className="actions">
              <button type="button" onClick={onVerify} disabled={busy}>
                {busy ? "Verifying..." : "Verify"}
              </button>
              <button type="button" onClick={clearForm}>
                Clear
              </button>
            </div>
          </section>

          <section className="panel result-panel">
            <div className="panel-header">
              <div>
                <h2>Verification result</h2>
              </div>
            </div>
            <div className={`result ${result?.ok ? "pass" : result ? "fail" : ""}`}>
              {result?.message || "Waiting for message batch."}
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
        </section>
      </div>

      <Footer />
    </main>
  );
}
