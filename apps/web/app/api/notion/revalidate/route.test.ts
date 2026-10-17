import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const { POST } = await import("./route");

function request(path: string, headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(`http://localhost:3000${path}`, { method: "POST", headers, body });
}

function sign(body: string, key = "secret_verify") {
  return `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
}

describe("POST /api/notion/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOTION_REVALIDATION_SECRET", "s3cret");
    vi.stubEnv("NOTION_WEBHOOK_SECRET", "secret_verify");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refreshes every page with the secret as a query param or bearer token", async () => {
    expect((await POST(request("/api/notion/revalidate?secret=s3cret"))).status).toBe(200);
    expect(
      (await POST(request("/api/notion/revalidate", { authorization: "Bearer s3cret" }))).status,
    ).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("rejects a wrong or missing secret", async () => {
    expect((await POST(request("/api/notion/revalidate?secret=nope"))).status).toBe(401);
    expect((await POST(request("/api/notion/revalidate"))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes on a correctly signed webhook event", async () => {
    const body = JSON.stringify({ type: "page.content_updated", entity: { id: "abc" } });
    const res = await POST(
      request("/api/notion/revalidate", { "x-notion-signature": sign(body) }, body),
    );
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects a webhook event signed with another key, or a tampered body", async () => {
    const body = JSON.stringify({ type: "page.content_updated" });
    const wrongKey = { "x-notion-signature": sign(body, "other") };
    expect((await POST(request("/api/notion/revalidate", wrongKey, body))).status).toBe(401);
    const tampered = { "x-notion-signature": sign(body) };
    expect((await POST(request("/api/notion/revalidate", tampered, `${body} `))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects signed events while NOTION_WEBHOOK_SECRET isn't set", async () => {
    vi.stubEnv("NOTION_WEBHOOK_SECRET", "");
    const body = "{}";
    expect(
      (await POST(request("/api/notion/revalidate", { "x-notion-signature": sign(body) }, body)))
        .status,
    ).toBe(401);
  });

  it("logs the verification token without refreshing anything", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await POST(
      request(
        "/api/notion/revalidate",
        {},
        JSON.stringify({ verification_token: "secret_abc123" }),
      ),
    );
    expect(res.status).toBe(200);
    expect(info.mock.calls[0]?.[0]).toContain("secret_abc123");
    expect(revalidatePath).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("doesn't log a verification token that could forge log lines", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await POST(
      request(
        "/api/notion/revalidate",
        {},
        JSON.stringify({ verification_token: "a\n[fake] line" }),
      ),
    );
    expect(res.status).toBe(401);
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});
