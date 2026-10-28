import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RefundDialog } from "@/components/payments/RefundDialog";
import type { GatewayPayment } from "@/utils/payments";

const payment: GatewayPayment = {
  id: "gp-1",
  charge_id: "charge-1",
  subscription_payment_id: null,
  provider_payment_id: "987",
  state: "partially_refunded",
  amount: 20000,
  refunded_amount: 5000,
  currency: "CLP",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
};

function renderDialog(props: Partial<React.ComponentProps<typeof RefundDialog>> = {}) {
  const onSubmit = vi.fn();
  render(
    <RefundDialog payment={payment} isSubmitting={false} onOpenChange={vi.fn()} onSubmit={onSubmit} {...props} />
  );
  return { onSubmit };
}

describe("RefundDialog", () => {
  it("propone por defecto el saldo reembolsable", () => {
    renderDialog();
    expect(screen.getByLabelText("Monto a reembolsar (CLP)")).toHaveValue("15000");
  });

  it("envía monto, motivo y una clave de idempotencia", () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText("Monto a reembolsar (CLP)"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), { target: { value: "Sesión cancelada" } });
    fireEvent.click(screen.getByRole("button", { name: /Reembolsar/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const data = onSubmit.mock.calls[0][0];
    expect(data).toMatchObject({ amount: 3000, reason: "Sesión cancelada" });
    expect(data.idempotencyKey).toMatch(/^refund-[0-9a-f-]{36}$/);
  });

  it("reutiliza la misma clave si el usuario hace clic dos veces", () => {
    const { onSubmit } = renderDialog();
    const button = screen.getByRole("button", { name: /Reembolsar/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit.mock.calls[0][0].idempotencyKey).toBe(onSubmit.mock.calls[1][0].idempotencyKey);
  });

  it("bloquea montos mayores al saldo y muestra el error", () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText("Monto a reembolsar (CLP)"), { target: { value: "16000" } });
    expect(screen.getByText(/El máximo a reembolsar es 15.000/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Reembolsar/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("descarta caracteres no numéricos", () => {
    renderDialog();
    const input = screen.getByLabelText("Monto a reembolsar (CLP)");
    fireEvent.change(input, { target: { value: "5.000abc" } });
    expect(input).toHaveValue("5000");
  });

  it("no envía mientras hay un reembolso en curso", () => {
    const { onSubmit } = renderDialog({ isSubmitting: true });
    fireEvent.click(screen.getByRole("button", { name: /Reembolsar/ }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no se muestra sin un pago seleccionado", () => {
    renderDialog({ payment: null });
    expect(screen.queryByText("Reembolsar pago")).not.toBeInTheDocument();
  });
});
