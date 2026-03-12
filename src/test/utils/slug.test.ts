import { describe, it, expect } from "vitest";
import { generateSlug, validateSlug } from "@/utils/slug";

describe("generateSlug", () => {
  it("converts a full name to a lowercase slug", () => {
    expect(generateSlug("Francisca Vargas")).toBe("francisca-vargas");
  });

  it("removes accents from Chilean names", () => {
    expect(generateSlug("José María López")).toBe("jose-maria-lopez");
    expect(generateSlug("Andrés Muñoz")).toBe("andres-munoz");
  });

  it("handles ñ correctly", () => {
    expect(generateSlug("Año Nuevo")).toBe("ano-nuevo");
  });

  it("removes special characters", () => {
    expect(generateSlug("Dr. Juan (Fono)")).toBe("dr-juan-fono");
  });

  it("trims and deduplicates hyphens", () => {
    expect(generateSlug("  Hola   Mundo  ")).toBe("hola-mundo");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });
});

describe("validateSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateSlug("francisca-vargas")).toBe(true);
    expect(validateSlug("abc")).toBe(true);
    expect(validateSlug("test-123")).toBe(true);
  });

  it("rejects too short slugs", () => {
    expect(validateSlug("ab")).toBe(false);
    expect(validateSlug("")).toBe(false);
  });

  it("rejects slugs with uppercase", () => {
    expect(validateSlug("Hello")).toBe(false);
  });

  it("rejects slugs starting or ending with hyphen", () => {
    expect(validateSlug("-test")).toBe(false);
    expect(validateSlug("test-")).toBe(false);
  });

  it("rejects slugs with special characters", () => {
    expect(validateSlug("test@slug")).toBe(false);
    expect(validateSlug("test slug")).toBe(false);
  });
});
