import styled from "styled-components";

export const BatchPanel = styled.section`
  display: flex;
  flex-direction: column;
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

export const BatchTextArea = styled.textarea`
  margin: 1rem 1.25rem 0;
  width: calc(100% - 2.5rem);
  min-height: 26rem;
  resize: vertical;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.72);
  color: #e5edf7;
  line-height: 1.55;
  outline: none;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
`;

export const PrimaryButton = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.2rem;
  background: #6ee7b7;
  color: #07111f;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const SecondaryButton = styled(PrimaryButton)`
  background: rgba(255, 255, 255, 0.1);
  color: #e5edf7;
`;
