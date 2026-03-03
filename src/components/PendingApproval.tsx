import { Clock, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function PendingApproval() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Cuenta en revisión</h1>
          <p className="text-muted-foreground">
            Tu registro ha sido recibido correctamente. Un administrador revisará tu cuenta
            y la aprobará a la brevedad.
          </p>
        </div>

        <div className="bg-card rounded-xl border p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium text-foreground">{user?.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recibirás una notificación cuando tu cuenta sea aprobada.
          </p>
        </div>

        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
