import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check email confirmation
  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-2">
              <Mail className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl">Confirma tu email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviamos un enlace de confirmación a<br />
              <strong>{user.email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Haz clic en el enlace del email para activar tu cuenta.
              Revisa tu carpeta de spam si no lo encuentras.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Ya confirmé mi email
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
