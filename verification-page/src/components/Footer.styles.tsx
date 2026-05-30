const css = `
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding: 1rem 1.4rem;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.78);
  color: #94a3b8;
  backdrop-filter: blur(16px);
}

.app-footer div {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.15rem;
}
`;

export function FooterStyles() {
  return <style>{css}</style>;
}
