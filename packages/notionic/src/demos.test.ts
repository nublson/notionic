import { describe, expect, it } from "vitest";
import { matchDemo } from "./demos";

const Button = () => null;
const demos = { "morph-button": Button };

describe("matchDemo", () => {
  it("matches a URL ending in /demos/<name>, on any host, with its query as params", () => {
    for (const url of [
      "https://nublson.com/demos/morph-button",
      "http://localhost:3000/demos/morph-button/",
      "https://preview.vercel.app/blog/demos/morph-button?speed=slow&size=2",
    ]) {
      expect(matchDemo(url, demos)?.Component).toBe(Button);
    }
    expect(matchDemo("https://x.dev/demos/morph-button?speed=slow", demos)).toEqual({
      name: "morph-button",
      params: { speed: "slow" },
      Component: Button,
    });
  });

  it("ignores other URLs, unknown names and inherited keys", () => {
    for (const url of [
      "https://nublson.com/morph-button",
      "https://nublson.com/demos",
      "https://nublson.com/demos/morph-button/extra",
      "https://nublson.com/demos/unknown",
      "https://nublson.com/demos/constructor",
      "https://nublson.com/demos/%E0%A4%A",
      "not a url",
    ]) {
      expect(matchDemo(url, demos)).toBeNull();
    }
    expect(matchDemo("https://nublson.com/demos/morph-button", undefined)).toBeNull();
  });
});
