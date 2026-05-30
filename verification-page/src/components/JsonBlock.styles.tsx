const css = `
.json-block {
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
`;

export function JsonBlockStyles() {
  return <style>{css}</style>;
}
