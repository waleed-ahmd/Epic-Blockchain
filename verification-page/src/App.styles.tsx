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

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

.page-title p {
  margin: 0.35rem 0 0;
  color: #94a3b8;
}

.network-pill {
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-weight: 700;
}

.panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
}

.panel-header {
  padding: 1.25rem 1.25rem 0;
}

.panel-header h2 {
  margin: 0;
}

.panel-header p {
  margin: 0.35rem 0 0;
  color: #94a3b8;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1rem;
}

@media (max-width: 860px) {
  .workspace,
  .page-title {
    grid-template-columns: 1fr;
    display: grid;
  }
}
`;

export function AppStyles() {
  return <style>{css}</style>;
}
