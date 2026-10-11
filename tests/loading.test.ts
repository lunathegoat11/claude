import { describe, expect, it } from "vitest";
import { LOADING_MESSAGES } from "@/lib/loading-messages";

describe("loading messages", () => {
  it("end every list with “Almost there…” and never repeat a line, and fit on one line on a phone", () => {
    for (const [kind, list] of Object.entries(LOADING_MESSAGES)) {
      expect(list.at(-1), kind).toBe("Almost there…");
      expect(new Set(list).size, kind).toBe(list.length);
      for (const m of list) expect(m.length, `${kind}: ${m}`).toBeLessThanOrEqual(40);
    }
  });
});
