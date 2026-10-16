import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/fetch.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  deps: {
    // The runtime code imports only React.
    onlyImport: ["react"],
    onlyBundle: ["@notionhq/client"],
    // Notion's types are inlined, so @notionhq/client is never a dependency.
    dts: { alwaysBundle: ["@notionhq/client"] },
  },
  copy: ["src/styles.css"],
});
