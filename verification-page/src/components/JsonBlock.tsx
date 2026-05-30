import { useMemo } from "react";
import { JsonBlockStyles } from "./JsonBlock.styles";

type JsonBlockProps = {
  value: unknown;
};

export function JsonBlock({ value }: JsonBlockProps) {
  const text = useMemo(() => {
    if (value === undefined) {
      return "Not available.";
    }

    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }, [value]);

  return (
    <pre className="json-block">
      <JsonBlockStyles />
      {text}
    </pre>
  );
}
