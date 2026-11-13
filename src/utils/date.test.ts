import { describe, expect, it } from "vitest";
import { isValidDateOnly } from "./date";
describe("isValidDateOnly", () => {
  it("accepts real calendar dates", () => {
    expect(isValidDateOnly("2026-11-13")).toBe(true);
    expect(isValidDateOnly("2024-02-29")).toBe(true);
  });
  it("rejects impossible and malformed dates", () => {
    expect(isValidDateOnly("2026-02-29")).toBe(false);
    expect(isValidDateOnly("2026-04-31")).toBe(false);
    expect(isValidDateOnly("13-11-2026")).toBe(false);
    expect(isValidDateOnly("2026-1-01")).toBe(false);
  });
});
