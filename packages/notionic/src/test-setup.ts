import { vi } from "vitest";

// No real DNS in tests: every name resolves to a public address unless a test
// says otherwise (`vi.mocked(lookup).mockImplementation…`).
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));
