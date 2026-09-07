import {describe, expect, it} from "vitest";
import {genToWei} from "../../lib/genlayer/amounts";

describe("GEN denomination", () => {
  it("converts one GEN to exactly 10^18 wei", () => {
    expect(genToWei(1)).toBe(1000000000000000000n);
  });

  it("rejects fractional and negative amounts", () => {
    expect(() => genToWei(1.5)).toThrow();
    expect(() => genToWei(-1)).toThrow();
  });
});
