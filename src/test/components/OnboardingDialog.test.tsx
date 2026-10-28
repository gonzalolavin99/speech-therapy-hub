import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { signOut, mutate } = vi.hoisted(() => ({ signOut: vi.fn(), mutate: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "nueva@test.cl" }, signOut }),
}));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ createProfile: { mutate, isPending: false } }),
}));

import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";

beforeEach(() => {
  signOut.mockReset();
  mutate.mockReset();
});

describe("OnboardingDialog", () => {
  it("no muestra la X de cerrar (el onboarding es obligatorio)", () => {
    render(<OnboardingDialog open />);
    // El botón de shadcn existe en el DOM, pero es el último hijo y queda oculto con [&>button:last-child]:hidden
    const close = screen.getByRole("button", { name: "Close" });
    expect(close.parentElement?.className).toContain("[&>button:last-child]:hidden");
    expect(close.parentElement?.lastElementChild).toBe(close);
  });

  it("no se cierra con Escape", () => {
    render(<OnboardingDialog open />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.getByText("¡Bienvenido a TherapyHub! 👋")).toBeInTheDocument();
  });

  it("muestra con qué cuenta se inició sesión y permite usar otra", () => {
    render(<OnboardingDialog open />);
    expect(screen.getByText(/nueva@test\.cl/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Usar otra cuenta/ }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("no avanza sin elegir profesión", () => {
    render(<OnboardingDialog open />);
    expect(screen.getByRole("button", { name: /Siguiente/ })).toBeDisabled();
  });
});
