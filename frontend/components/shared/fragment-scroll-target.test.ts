import { fragmentTargetsElement } from "@cmsjs/components/shared/fragment-scroll-target";
import { describe, expect, it } from "vitest";

describe("fragmentTargetsElement", () => {
  it("accepts exact and percent-decoded equality", () => {
    expect(fragmentTargetsElement("#contatti", "contatti")).toBe(true);
    expect(
      fragmentTargetsElement("#contatti%2Dsociali", "contatti-sociali"),
    ).toBe(true);
  });

  it("rejects unrelated, empty, missing-marker, and malformed fragments", () => {
    expect(fragmentTargetsElement("#altro", "contatti")).toBe(false);
    expect(fragmentTargetsElement("#", "contatti")).toBe(false);
    expect(fragmentTargetsElement("contatti", "contatti")).toBe(false);
    expect(fragmentTargetsElement("#%E0%A4%A", "contatti")).toBe(false);
  });
});
