import type { VerificationOutput } from "../types";
import { Brand, BrandMark, BrandText, StatusBadge, Topbar } from "./Header.styles";

type HeaderProps = {
  status: string;
  result?: VerificationOutput;
};

function getStatusState(result?: VerificationOutput) {
  if (!result) {
    return "idle";
  }

  return result.ok ? "pass" : "fail";
}

export function Header({ status, result }: HeaderProps) {
  return (
    <Topbar>
      <Brand>
        <BrandMark>S</BrandMark>
        <BrandText>
          <strong>SecureMsg Verification</strong>
          <span>Sepolia integrity check</span>
        </BrandText>
      </Brand>
      <StatusBadge $state={getStatusState(result)}>{status}</StatusBadge>
    </Topbar>
  );
}
