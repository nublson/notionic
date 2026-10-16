import type { RichText } from "./types";

/** Joins class names, skipping empty ones. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** The text of a rich text array, without formatting. */
export function plainText(text: RichText): string {
  return text.map((item) => item.plain_text).join("");
}

/** Logs once per message, in development only. */
const warned = new Set<string>();
export function warnOnce(message: string): void {
  if (
    typeof process === "undefined" ||
    process.env.NODE_ENV !== "development" ||
    warned.has(message)
  ) {
    return;
  }
  warned.add(message);
  console.warn(`[notionic] ${message}`);
}
