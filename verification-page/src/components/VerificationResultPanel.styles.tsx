import styled from "styled-components";

type ResultState = "idle" | "pass" | "fail";

export const ResultPanel = styled.section`
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
`;

export const PanelHeader = styled.div`
  padding: 1.25rem 1.25rem 0;
`;

export const PanelTitle = styled.h2`
  margin: 0;
`;

export const PanelDescription = styled.p`
  margin: 0.35rem 0 0;
  color: #94a3b8;
`;

export const ResultMessage = styled.div<{ $state: ResultState }>`
  margin: 1rem 1.25rem 0;
  border-radius: 1rem;
  padding: 1rem;
  background: ${({ $state }) =>
    $state === "pass"
      ? "rgba(34, 197, 94, 0.14)"
      : $state === "fail"
        ? "rgba(248, 113, 113, 0.14)"
        : "rgba(148, 163, 184, 0.14)"};
  color: ${({ $state }) =>
    $state === "pass" ? "#86efac" : $state === "fail" ? "#fca5a5" : "#cbd5e1"};
  font-weight: 700;
`;

export const ResultStack = styled.div`
  display: grid;
  gap: 1rem;
  padding: 1rem 1.25rem 1.25rem;
`;

export const OutputSection = styled.section``;

export const OutputLabel = styled.h3`
  margin: 0 0 0.5rem;
  color: #cbd5e1;
  font-size: 0.95rem;
`;
