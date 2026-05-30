import {
  FooterBrand,
  FooterContainer,
  FooterNetwork,
  FooterSubtitle,
  FooterTitle,
} from "./Footer.styles";

export function Footer() {
  return (
    <FooterContainer>
      <FooterBrand>
        <FooterTitle>SecureMsg</FooterTitle>
        <FooterSubtitle>Blockchain integrity verifier</FooterSubtitle>
      </FooterBrand>
      <FooterNetwork>Network: Sepolia</FooterNetwork>
    </FooterContainer>
  );
}
