import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();

  // MercadoPago returns: status, payment_id, merchant_order_id, external_reference
  const status = searchParams.get("status") || searchParams.get("collection_status") || "unknown";
  const paymentId = searchParams.get("payment_id");
  const externalRef = searchParams.get("external_reference");

  // Determine result type from URL path
  const path = window.location.pathname;
  const isSuccess = path.includes("success") || status === "approved";
  const isPending = path.includes("pending") || status === "pending" || status === "in_process";
  const isFailure = path.includes("failure") || status === "rejected" || status === "cancelled";

  const getConfig = () => {
    if (isSuccess) {
      return {
        icon: CheckCircle,
        iconColor: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        title: "¡Pago exitoso!",
        description: "Tu pago ha sido procesado correctamente. El profesional será notificado automáticamente.",
        detail: paymentId ? `ID de pago: ${paymentId}` : null,
      };
    }
    if (isPending) {
      return {
        icon: Clock,
        iconColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        title: "Pago en proceso",
        description: "Tu pago está siendo procesado. Recibirás una confirmación cuando se complete.",
        detail: paymentId ? `ID de pago: ${paymentId}` : null,
      };
    }
    return {
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      title: "Pago no completado",
      description: "El pago no pudo ser procesado. Puedes intentar nuevamente desde el portal.",
      detail: null,
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className={`h-20 w-20 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`h-10 w-10 ${config.iconColor}`} />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          {config.title}
        </h1>
        <p className="text-muted-foreground mb-4">
          {config.description}
        </p>

        {config.detail && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-6 font-mono">
            {config.detail}
          </p>
        )}

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al portal
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Pago procesado por MercadoPago · TherapyHub
        </p>
      </div>
    </div>
  );
}
