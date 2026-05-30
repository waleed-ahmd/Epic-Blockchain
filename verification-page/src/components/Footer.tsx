import { FooterStyles } from "./Footer.styles";

export function Footer() {
  return (
    <footer className="app-footer">
      <FooterStyles />
      <div>
        <strong>SecureMsg</strong>
        <span>Read-only blockchain integrity verifier</span>
      </div>
      <span>Network: Sepolia</span>
    </footer>
  );
}
