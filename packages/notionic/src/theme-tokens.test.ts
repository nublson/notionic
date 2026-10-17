import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// shadcn/ui's color tokens, longest first so `muted-foreground` wins over `muted`.
const SHADCN_TOKENS = [
  "accent-foreground",
  "card-foreground",
  "destructive-foreground",
  "muted-foreground",
  "popover-foreground",
  "primary-foreground",
  "secondary-foreground",
  "accent",
  "background",
  "border",
  "card",
  "destructive",
  "foreground",
  "input",
  "muted",
  "popover",
  "primary",
  "ring",
  "secondary",
];

const src = import.meta.dirname;
const read = (path: string) => readFileSync(join(src, path), "utf8");
const captures = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((match) => match[1] ?? "");

function usedTokens() {
  const files = readdirSync(src, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"),
  );
  const classes = new RegExp(`\\b[a-z]+-(${SHADCN_TOKENS.join("|")})\\b`, "g");
  const tokens = files.flatMap((file) => captures(read(file), classes));
  tokens.push(...captures(read("styles.css"), /var\(--color-([a-z-]+)/g));
  return [...new Set(tokens)].sort();
}

describe("theme tokens", () => {
  it("are all in the README's mapping", () => {
    const readme = read("../README.md");
    const block = readme.slice(readme.indexOf("@theme inline {"));
    const documented = captures(block.slice(0, block.indexOf("}")), /--color-([a-z-]+):/g);
    expect(documented.sort()).toEqual(usedTokens());
  });
});
