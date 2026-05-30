const css = `
.batch-panel {
  display: flex;
  flex-direction: column;
}

.batch-panel textarea {
  margin: 1rem 1.25rem 0;
  width: calc(100% - 2.5rem);
}

.actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
}
`;

export function MessageBatchPanelStyles() {
  return <style>{css}</style>;
}
