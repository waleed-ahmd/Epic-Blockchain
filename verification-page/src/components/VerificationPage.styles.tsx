const css = `
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

button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.2rem;
  background: #6ee7b7;
  color: #07111f;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

button + button {
  background: rgba(255, 255, 255, 0.1);
  color: #e5edf7;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.72);
  color: #e5edf7;
  outline: none;
}

input {
  padding: 0.75rem 0.9rem;
}

textarea {
  min-height: 26rem;
  resize: vertical;
  padding: 1rem;
  line-height: 1.55;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}

pre {
  overflow: auto;
  margin: 0;
  max-height: 18rem;
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: rgba(2, 6, 23, 0.72);
  color: #cbd5e1;
  font-size: 0.86rem;
  line-height: 1.45;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar,
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(16px);
}

.app-footer {
  margin-top: auto;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 0;
  color: #94a3b8;
}

.app-footer div,
.brand {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.app-footer div {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.15rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.8rem;
  background: #6ee7b7;
  color: #07111f;
  font-weight: 800;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  color: #94a3b8;
  font-size: 0.9rem;
}

.status,
.network-pill {
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-weight: 700;
}

.status.pass,
.result.pass {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.status.fail,
.result.fail {
  background: rgba(248, 113, 113, 0.14);
  color: #fca5a5;
}

.app-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0;
}

.page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.4rem;
}

.page-title h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  letter-spacing: -0.06em;
}

.page-title p,
.panel-header p {
  margin: 0.35rem 0 0;
  color: #94a3b8;
}

.settings,
.panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
}

.settings {
  margin-bottom: 1rem;
  padding: 1rem;
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

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1rem;
}

.panel {
  padding: 1rem;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-header h2 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.result {
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  font-weight: 700;
}

.result-stack {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.result-stack h3 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
  color: #e2e8f0;
}

@media (max-width: 880px) {
  .topbar,
  .app-footer,
  .page-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace {
    grid-template-columns: 1fr;
  }
}
`;

export function VerificationPageStyles() {
  return <style>{css}</style>;
}
