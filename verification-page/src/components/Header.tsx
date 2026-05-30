import type { VerificationOutput } from "../types";

type HeaderProps = {
  status: string;
  result: VerificationOutput | null;
};

export function Header({ status, result }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>SecureMsg Verification</strong>
          <span>Sepolia integrity check</span>
        </div>
      </div>
      <div className={`status ${result?.ok ? "pass" : result ? "fail" : ""}`}>{status}</div>
    </header>
  );
}
