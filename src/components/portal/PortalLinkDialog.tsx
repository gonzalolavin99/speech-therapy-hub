import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Loader2, Link, RefreshCcw, MessageCircle } from "lucide-react";
import { usePortalTokens } from "@/hooks/usePortalTokens";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone?: string | null;
}

export function PortalLinkDialog({ open, onOpenChange, patientId, patientName, patientPhone }: Props) {
  const { getTokenForPatient, generateToken } = usePortalTokens();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const existingToken = getTokenForPatient(patientId);

  useEffect(() => {
    if (existingToken) {
      setGeneratedLink(`${window.location.origin}/portal/${existingToken.token}`);
    } else {
      setGeneratedLink(null);
    }
  }, [existingToken, open]);

  const handleGenerate = async () => {
    const result = await generateToken.mutateAsync(patientId);
    if (result?.token) {
      setGeneratedLink(`${window.location.origin}/portal/${result.token}`);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Enlace copiado');
    }
  };

  const shareViaWhatsApp = () => {
    if (generatedLink && patientPhone) {
      const phone = patientPhone.replace(/\D/g, '');
      const message = `Hola ${patientName}, te comparto el enlace a tu portal de paciente donde podrás ver tus citas, progreso y más: ${generatedLink}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Portal del Paciente
          </DialogTitle>
          <DialogDescription>
            Genera un enlace privado para que {patientName} acceda a su portal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {generatedLink ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Enlace del portal</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="text-xs bg-muted"
                  />
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {existingToken && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Accesos: {existingToken.access_count}
                    {existingToken.last_accessed_at && (
                      <> · Último: {new Date(existingToken.last_accessed_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar enlace
                </Button>
                {patientPhone && (
                  <Button variant="outline" size="sm" onClick={shareViaWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Enviar por WhatsApp
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Abrir portal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generateToken.isPending}
                >
                  <RefreshCcw className="h-4 w-4 mr-1.5" />
                  Regenerar
                </Button>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Este enlace es privado y da acceso a la información del paciente. Compártelo solo con {patientName} o su apoderado.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Link className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-4">
                Genera un enlace único para que {patientName} acceda a su portal
              </p>
              <Button onClick={handleGenerate} disabled={generateToken.isPending}>
                {generateToken.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Generar enlace del portal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
