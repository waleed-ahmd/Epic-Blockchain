import { useMemo, useState } from "react";
import { DEFAULT_SEPOLIA_RPC_URL } from "./blockchain";
import { parseProofPackage, verifyProofPackage } from "./verify";
import type { VerificationOutput } from "./types";
import "./styles.css";

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => {
    if (!value) {
      return "Not available.";
    }
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }, [value]);

  return <pre>{text}</pre>;
}

export default function App() {
  const [proofJson, setProofJson] = useState("");
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_SEPOLIA_RPC_URL);
  const [contractOverride, setContractOverride] = useState("");
  const [result, setResult] = useState<VerificationOutput | null>(null);
  const [status, setStatus] = useState("Not verified yet.");
  const [busy, setBusy] = useState(false);

  async function onVerify() {
    setBusy(true);
    setStatus("Verifying proof package...");
    setResult(null);

    try {
      const packageData = parseProofPackage(proofJson);
      const output = await verifyProofPackage(packageData, rpcUrl, contractOverride);
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

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <h1>SecureMsg Verification</h1>
          <p>Paste a proof package and verify it against the Sepolia contract.</p>
        </div>
        <div className={`status ${result?.ok ? "pass" : result ? "fail" : ""}`}>{status}</div>
      </section>

      <section className="settings">
        <label>
          Sepolia RPC URL
          <input value={rpcUrl} onChange={(event) => setRpcUrl(event.target.value)} />
        </label>
        <label>
          Contract override
          <input
            value={contractOverride}
            onChange={(event) => setContractOverride(event.target.value)}
            placeholder="Optional; proof contract_address is used by default"
          />
        </label>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-header">
            <h2>Proof Package</h2>
          </div>
          <textarea
            value={proofJson}
            onChange={(event) => setProofJson(event.target.value)}
            placeholder="Paste proof package JSON here"
            spellCheck={false}
          />
          <div className="actions">
            <button type="button" onClick={onVerify} disabled={busy}>
              {busy ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setProofJson("");
                setResult(null);
                setStatus("Not verified yet.");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>Result</h2>
          <div className={`result ${result?.ok ? "pass" : result ? "fail" : ""}`}>
            {result?.message || "No verification result yet."}
          </div>
          <h3>Computed Envelope Hash</h3>
          <JsonBlock value={result?.computedEnvelopeHash} />
          <h3>Computed Segment Hash</h3>
          <JsonBlock value={result?.computedSegmentHash} />
          <h3>On-Chain Record</h3>
          <JsonBlock value={result?.onChainRecord} />
          <h3>Canonical Envelope</h3>
          <JsonBlock value={result?.canonicalEnvelope} />
        </div>
      </section>
    </main>
  );
}
