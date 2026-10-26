// @vitest-environment happy-dom
import { act, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { NotionRenderer } from "./renderer";
import { block, renderToHtml, richText } from "./test-utils";
import type { NotionBlock } from "./types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Broken(): never {
  throw new Error("broken demo");
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}

const blocks: NotionBlock[] = [
  block("embed", { url: "https://nublson.com/demos/broken", caption: [richText("Broken.")] }),
  block("embed", { url: "https://nublson.com/demos/counter", caption: [] }),
];
const page = <NotionRenderer blocks={blocks} demos={{ broken: Broken, counter: Counter }} />;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DemoBoundary", () => {
  it("keeps the frame and caption of a demo that throws after hydration", async () => {
    const container = document.createElement("div");
    container.innerHTML = await renderToHtml(page);
    document.body.append(container);

    await act(async () => {
      hydrateRoot(container, page, { onCaughtError: () => {}, onRecoverableError: () => {} });
    });

    const [broken, counter] = container.querySelectorAll("figure");
    expect(broken?.querySelector("div")?.innerHTML).toBe("");
    expect(broken?.querySelector("figcaption")?.textContent).toBe("Broken.");

    // The rest of the page hydrated and still responds.
    const button = counter?.querySelector("button");
    await act(async () => button?.click());
    expect(button?.textContent).toBe("1");
  });
});
