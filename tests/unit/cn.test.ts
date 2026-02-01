import { describe, it, expect } from "vitest";
import { cn } from "@/utils/cn";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", true && "included", false && "excluded")).toBe(
      "base included"
    );
  });

  it("should merge Tailwind classes without conflicts", () => {
    // px-4 should override px-2
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle undefined and null values", () => {
    expect(cn("base", undefined, null, "valid")).toBe("base valid");
  });

  it("should handle empty strings", () => {
    expect(cn("base", "", "valid")).toBe("base valid");
  });

  it("should handle objects with boolean values", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});
