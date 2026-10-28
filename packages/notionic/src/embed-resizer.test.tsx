// @vitest-environment happy-dom
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { resizeHeight } from "./embed-resizer";
import { NotionRenderer, type NotionRendererProps } from "./renderer";
import { block, renderToHtml } from "./test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const embed = (url: string) => block("embed", { url, caption: [] });

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

/**
 * Renders the page on the server, hydrates it, and gives each live frame a
 * window of its own, as a loaded iframe has: happy-dom doesn't load iframe
 * pages (it logs a notice for each).
 */
async function mount(props: NotionRendererProps) {
  const page = <NotionRenderer {...props} />;
  const container = document.createElement("div");
  container.innerHTML = await renderToHtml(page);
  document.body.append(container);
  await act(async () => {
    root = hydrateRoot(container, page);
  });
  const frames = Array.from(container.querySelectorAll("iframe"));
  const windows = frames.map((frame) => {
    const contentWindow = {} as Window;
    Object.defineProperty(frame, "contentWindow", { value: contentWindow });
    return contentWindow;
  });
  return { container, frames, windows };
}

function post(source: Window, origin: string, data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { source, origin, data }));
}

describe("EmbedResizer", () => {
  it("resizes the frame whose page posts notionic:resize, from an allowed origin", async () => {
    const { frames, windows } = await mount({
      blocks: [embed("https://sanding.space/demos/a"), embed("https://codepen.io/x/pen/y")],
      embeds: ["sanding.space", "codepen.io"],
    });
    const [sanding, codepen] = frames;
    // sanding.space redirects to www.sanding.space: the message's origin counts.
    post(windows[0]!, "https://www.sanding.space", { type: "notionic:resize", height: 420.4 });
    expect(sanding?.style.height).toBe("420px");
    expect(codepen?.style.height).toBe("");
    // Capped at 9999.
    post(windows[1]!, "https://codepen.io", { type: "notionic:resize", height: 20000 });
    expect(codepen?.style.height).toBe("9999px");
  });

  it("ignores other origins, other sources and other messages", async () => {
    const { frames, windows } = await mount({
      blocks: [embed("https://sanding.space/demos/a")],
      embeds: ["sanding.space"],
    });
    const frame = frames[0]!;
    const source = windows[0]!;
    // A frame that navigated to another site, or a page outside notionic's frames.
    post(source, "https://evil.example", { type: "notionic:resize", height: 300 });
    post({} as Window, "https://sanding.space", { type: "notionic:resize", height: 300 });
    for (const data of [
      { type: "resize", height: 300 },
      { type: "notionic:resize", height: "300" },
      { type: "notionic:resize", height: 0 },
      { type: "notionic:resize", height: -5 },
      { type: "notionic:resize", height: Number.NaN },
      { type: "notionic:resize", height: Number.POSITIVE_INFINITY },
      "notionic:resize",
      null,
    ]) {
      post(source, "https://sanding.space", data);
    }
    expect(frame.style.height).toBe("");
  });

  it("checks a function policy against each frame's own origin", async () => {
    const { frames, windows } = await mount({
      blocks: [embed("https://sanding.space/demos/a")],
      embeds: (url) => url.includes("sanding"),
    });
    post(windows[0]!, "https://www.sanding.space", { type: "notionic:resize", height: 300 });
    expect(frames[0]?.style.height).toBe("");
    post(windows[0]!, "https://sanding.space", { type: "notionic:resize", height: 300 });
    expect(frames[0]?.style.height).toBe("300px");
  });

  it("starts at ?height= and stops listening once unmounted", async () => {
    const { frames, windows } = await mount({
      blocks: [embed("https://sanding.space/demos/a?height=280")],
      embeds: true,
    });
    const frame = frames[0]!;
    expect(frame.style.height).toBe("280px");
    post(windows[0]!, "https://sanding.space", { type: "notionic:resize", height: 500 });
    expect(frame.style.height).toBe("500px");
    act(() => root?.unmount());
    root = undefined;
    post(windows[0]!, "https://sanding.space", { type: "notionic:resize", height: 600 });
    expect(frame.style.height).toBe("500px");
  });

  it("isn't rendered on a page without live embeds", async () => {
    const html = await renderToHtml(
      <NotionRenderer blocks={[embed("https://sanding.space/demos/a")]} />,
    );
    expect(html).not.toContain("<span hidden");
    expect(
      await renderToHtml(
        <NotionRenderer blocks={[embed("https://sanding.space/demos/a")]} embeds={true} />,
      ),
    ).toContain("<span hidden");
  });
});

describe("resizeHeight", () => {
  it("rounds, keeps at least 1px and caps at 9999", () => {
    expect(resizeHeight({ type: "notionic:resize", height: 0.3 })).toBe(1);
    expect(resizeHeight({ type: "notionic:resize", height: 279.6 })).toBe(280);
    expect(resizeHeight({ type: "notionic:resize", height: 1e9 })).toBe(9999);
  });
});
