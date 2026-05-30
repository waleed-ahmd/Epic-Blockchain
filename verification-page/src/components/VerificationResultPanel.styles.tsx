const css = `
.result-panel {
  min-width: 0;
}

.result {
  margin: 1rem 1.25rem 0;
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-weight: 700;
}

.result.pass {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.result.fail {
  background: rgba(248, 113, 113, 0.14);
  color: #fca5a5;
}

.result-stack {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.25rem 1.25rem;
}

.result-stack h3 {
  margin: 0 0 0.5rem;
  color: #cbd5e1;
  font-size: 0.95rem;
}
`;

export function VerificationResultPanelStyles() {
  return <style>{css}</style>;
}
