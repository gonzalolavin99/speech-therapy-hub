import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un carácter especial (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    const passed = PASSWORD_RULES.filter(r => r.test(password));
    return { passed: passed.length, total: PASSWORD_RULES.length, rules: PASSWORD_RULES.map(r => ({ ...r, ok: r.test(password) })) };
  }, [password]);

  const isPasswordValid = passwordStrength.passed === passwordStrength.total;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error('Error al iniciar sesión', {
        description: error.message,
      });
    } else {
      toast.success('¡Bienvenido!');
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error('Contraseña no cumple los requisitos');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast.error('Error al registrarse', {
        description: error.message,
      });
    } else {
      setSignUpEmail(email);
      setSignUpSuccess(true);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Ingresa tu email');
      return;
    }
    setLoading(true);
    
    const { error } = await resetPassword(email);
    
    if (error) {
      toast.error('Error al enviar email', {
        description: error.message,
      });
    } else {
      setResetEmailSent(true);
      toast.success('Email enviado', {
        description: 'Revisa tu bandeja de entrada.',
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TherapyHub</CardTitle>
          <CardDescription>
            Plataforma de gestión clínica para profesionales de la salud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Contraseña</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Cargando...' : 'Iniciar Sesión'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-sm text-primary hover:underline mt-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {signUpSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Mail className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">¡Revisa tu email!</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enviamos un enlace de confirmación a<br />
                      <strong>{signUpEmail}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Haz clic en el enlace del email para activar tu cuenta.
                      Revisa tu carpeta de spam si no lo encuentras.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setSignUpSuccess(false); setPassword(''); setConfirmPassword(''); }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al inicio
                  </Button>
                </div>
              ) : (
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password-signup"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Contraseña segura"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-1">
                        {Array.from({ length: passwordStrength.total }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors",
                              i < passwordStrength.passed
                                ? passwordStrength.passed <= 2 ? 'bg-destructive'
                                : passwordStrength.passed <= 3 ? 'bg-amber-500'
                                : 'bg-green-500'
                                : 'bg-muted'
                            )}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {passwordStrength.rules.map((rule) => (
                          <div key={rule.id} className="flex items-center gap-1.5 text-[11px]">
                            {rule.ok
                              ? <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                              : <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            }
                            <span className={rule.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Las contraseñas no coinciden
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Contraseñas coinciden
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || !isPasswordValid || !passwordsMatch}>
                  {loading ? 'Cargando...' : 'Crear Cuenta'}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Al registrarte, recibirás un email de confirmación para activar tu cuenta.
                </p>
              </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de recuperación de contraseña */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => {
        setShowForgotPassword(open);
        if (!open) setResetEmailSent(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recuperar Contraseña
            </DialogTitle>
            <DialogDescription>
              Te enviaremos un enlace para restablecer tu contraseña
            </DialogDescription>
          </DialogHeader>
          
          {resetEmailSent ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium">¡Email enviado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Revisa tu bandeja de entrada en <strong>{email}</strong>
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
