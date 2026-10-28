import { defineConfig } from "tsdown";

export default defineConfig({
  // The demo boundary and embed resizer are their own chunks, so their
  // "use client" stays at the top.
  entry: [
    "src/index.ts",
    "src/fetch.ts",
    "src/markdown.ts",
    "src/demo-boundary.tsx",
    "src/embed-resizer.tsx",
  ],
  format: "esm",
  platform: "neutral",
  dts: true,
  deps: {
    // The runtime code imports only React, plus Node's DNS, loaded lazily by
    // `notionic/fetch` to refuse private addresses where the runtime has it.
    onlyImport: ["react", /^node:dns/],
    onlyBundle: ["@notionhq/client"],
    // Notion's types are inlined, so @notionhq/client is never a dependency.
    dts: { alwaysBundle: ["@notionhq/client"] },
  },
  copy: ["src/styles.css"],
});
