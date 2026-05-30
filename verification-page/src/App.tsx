import { useState } from "react";
import { DEFAULT_SEPOLIA_RPC_URL } from "./blockchain";
import { AppStyles } from "./App.styles";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MessageBatchPanel } from "./components/MessageBatchPanel";
import { VerificationResultPanel } from "./components/VerificationResultPanel";
import { VerificationSettings } from "./components/VerificationSettings";
import { parseMessageBatch, verifyMessageBatch } from "./verify";
import type { VerificationOutput } from "./types";

export default function App() {
  const [batchJson, setBatchJson] = useState("");
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_SEPOLIA_RPC_URL);
  const [result, setResult] = useState<VerificationOutput | undefined>();
  const [status, setStatus] = useState("Not verified yet.");
  const [busy, setBusy] = useState(false);

  async function onVerify() {
    setBusy(true);
    setStatus("Verifying...");
    setResult(undefined);

    try {
      const batch = parseMessageBatch(batchJson);
      const output = await verifyMessageBatch(batch, rpcUrl);
      setResult(output);
      setStatus(output.ok ? "PASS" : "FAIL");
    } catch (error) {
      setResult({
        ok: false,
        statusMessage: error instanceof Error ? error.message : "Verification failed",
      });
      setStatus("FAIL");
    } finally {
      setBusy(false);
    }
  }

  function clearForm() {
    setBatchJson("");
    setResult(undefined);
    setStatus("Not verified yet.");
  }

  return (
    <main className="app">
      <AppStyles />
      <Header status={status} result={result} />

      <div className="app-shell">
        <section className="page-title">
          <div>
            <h1>Verify message batch</h1>
            <p>Paste received messages to rebuild the messages_hash after sorting by index.</p>
          </div>
          <span className="network-pill">Sepolia</span>
        </section>

        <VerificationSettings rpcUrl={rpcUrl} onRpcUrlChange={setRpcUrl} />

        <section className="workspace">
          <MessageBatchPanel
            batchJson={batchJson}
            busy={busy}
            onBatchJsonChange={setBatchJson}
            onVerify={onVerify}
            onClear={clearForm}
          />
          <VerificationResultPanel result={result} />
        </section>
      </div>

      <Footer />
    </main>
  );
}
