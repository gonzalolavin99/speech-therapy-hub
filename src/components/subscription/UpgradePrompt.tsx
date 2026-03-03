import { Crown, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  currentUsage?: string;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  title = "Límite alcanzado",
  description = "Has alcanzado el límite de tu plan actual. Actualiza para continuar sin restricciones.",
  currentUsage,
}: UpgradePromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        {currentUsage && (
          <p className="text-center text-sm font-medium text-muted-foreground bg-muted rounded-lg py-2">
            {currentUsage}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button asChild>
            <Link to="/planes">
              <Crown className="h-4 w-4 mr-2" />
              Ver planes
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureLockedProps {
  feature: string;
}

export function FeatureLocked({ feature }: FeatureLockedProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span>{feature} — disponible en plan Profesional</span>
      <Link to="/planes" className="text-primary hover:underline font-medium">
        Actualizar
      </Link>
    </div>
  );
}
