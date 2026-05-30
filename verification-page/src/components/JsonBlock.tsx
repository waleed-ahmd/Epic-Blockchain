import type { JsonValue } from "../types";
import { JsonPre } from "./JsonBlock.styles";

type JsonBlockProps = {
  value?: JsonValue;
};

export function JsonBlock({ value }: JsonBlockProps) {
  const text =
    value === undefined
      ? "Not available."
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);

  return <JsonPre>{text}</JsonPre>;
}
