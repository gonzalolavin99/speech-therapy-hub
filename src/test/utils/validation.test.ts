import { describe, it, expect } from "vitest";
import { validatePhone, validateRUT } from "@/utils/validation";

describe("validatePhone", () => {
  it("es opcional", () => {
    expect(validatePhone("")).toMatchObject({ valid: true, formatted: "" });
  });

  it("normaliza los formatos chilenos a +56", () => {
    expect(validatePhone("+56 9 1234 5678")).toMatchObject({ valid: true });
    expect(validatePhone("56912345678")).toMatchObject({ valid: true });
    expect(validatePhone("912345678")).toMatchObject({ valid: true });
  });

  it("rechaza números que no son chilenos o con largo incorrecto", () => {
    expect(validatePhone("12345").valid).toBe(false);
    expect(validatePhone("+1 555 123 4567").valid).toBe(false);
  });
});

describe("validateRUT", () => {
  it("valida el dígito verificador", () => {
    expect(validateRUT("11.111.111-1").valid).toBe(true);
    expect(validateRUT("11.111.111-2").valid).toBe(false);
  });

  it("exige el RUT", () => {
    expect(validateRUT("")).toMatchObject({ valid: false, error: "RUT es requerido" });
  });
});
