import { useMemo } from "react";

type JsonBlockProps = {
  value: unknown;
};

export function JsonBlock({ value }: JsonBlockProps) {
  const text = useMemo(() => {
    if (!value) {
      return "Not available.";
    }

    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }, [value]);

  return <pre>{text}</pre>;
}
