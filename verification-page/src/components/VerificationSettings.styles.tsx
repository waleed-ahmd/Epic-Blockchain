const css = `
.settings {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
}

.settings summary {
  cursor: pointer;
  font-weight: 700;
}

.settings-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.settings label {
  display: grid;
  gap: 0.4rem;
  color: #cbd5e1;
}
`;

export function VerificationSettingsStyles() {
  return <style>{css}</style>;
}
