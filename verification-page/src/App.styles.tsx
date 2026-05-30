import styled, { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  :root {
    color: #e5edf7;
    background: #0d1320;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(41, 121, 255, 0.22), transparent 32rem),
      radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.16), transparent 28rem),
      #0d1320;
  }

  button,
  input,
  textarea {
    font: inherit;
  }
`;

export const AppContainer = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const AppShell = styled.div`
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0;
`;

export const PageTitle = styled.section`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.4rem;

  @media (max-width: 860px) {
    display: grid;
    grid-template-columns: 1fr;
  }
`;

export const PageHeading = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  letter-spacing: -0.06em;
`;

export const PageDescription = styled.p`
  margin: 0.35rem 0 0;
  color: #94a3b8;
`;

export const NetworkPill = styled.span`
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-weight: 700;
`;

export const Workspace = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;
