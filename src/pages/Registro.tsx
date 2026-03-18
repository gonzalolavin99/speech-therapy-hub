import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Stethoscope,
  ClipboardCheck,
  Sparkles,
  Calendar,
  Shield,
  Users,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { id: "length", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "Una letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "Un número", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "Un carácter especial (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const benefits = [
  { icon: ClipboardCheck, text: "+10 evaluaciones estandarizadas" },
  { icon: Sparkles, text: "Análisis con inteligencia artificial" },
  { icon: Users, text: "Gestión completa de pacientes" },
  { icon: Calendar, text: "Agenda y citas integradas" },
  { icon: CreditCard, text: "Control de pagos y boletas" },
  { icon: Shield, text: "Cumplimiento Ley 19.628" },
];

export default function Registro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Crear Cuenta Gratis — TherapyHub";
    return () => { document.title = "TherapyHub"; };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const passwordStrength = useMemo(() => {
    const rules = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
    const passed = rules.filter((r) => r.ok).length;
    return { passed, total: PASSWORD_RULES.length, rules };
  }, [password]);

  const isPasswordValid = passwordStrength.passed === passwordStrength.total;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Contraseña no cumple los requisitos");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);

    if (error) {
      toast.error("Error al registrarse", { description: error.message });
    } else {
      setSignUpEmail(email);
      setSignUpSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            TherapyHub
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ¿Ya tienes cuenta? <span className="text-primary font-medium">Inicia sesión</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12 flex flex-col lg:flex-row gap-10 lg:gap-16 items-center lg:items-start">
          {/* Left: Benefits panel */}
          <div className="w-full lg:w-1/2 max-w-lg lg:max-w-none lg:pt-8">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  Comienza a gestionar tu consulta{" "}
                  <span className="text-primary">de forma profesional</span>
                </h1>
                <p className="text-muted-foreground mt-3 text-base lg:text-lg">
                  Únete a profesionales de salud que ya usan TherapyHub para optimizar su práctica clínica.
                </p>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 text-sm font-medium">
                  Gratis para siempre
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 text-sm font-medium">
                  Sin tarjeta de crédito
                </span>
                <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 text-sm font-medium">
                  Activa en 2 minutos
                </span>
              </div>

              {/* Benefits list */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Incluido en tu plan gratuito:</p>
                {benefits.map((b) => (
                  <div key={b.text} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <b.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{b.text}</span>
                  </div>
                ))}
              </div>

              {/* Social proof */}
              <div className="hidden lg:block pt-2">
                <p className="text-xs text-muted-foreground">
                  Diseñado para fonoaudiólogos, psicólogos y profesionales de salud en Chile.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Form panel */}
          <div className="w-full lg:w-1/2 max-w-md">
            <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
              {signUpSuccess ? (
                /* Success state */
                <div className="text-center py-4 space-y-5">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">¡Revisa tu email!</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enviamos un enlace de confirmación a
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1">{signUpEmail}</p>
                    <p className="text-xs text-muted-foreground mt-4">
                      Haz clic en el enlace del email para activar tu cuenta.
                      Revisa tu carpeta de spam si no lo encuentras.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/login">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Ir a Iniciar Sesión
                      </Link>
                    </Button>
                    <button
                      onClick={() => { setSignUpSuccess(false); setPassword(""); setConfirmPassword(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Registrar otra cuenta
                    </button>
                  </div>
                </div>
              ) : (
                /* Signup form */
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">Crear cuenta gratis</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Completa tus datos para comenzar
                    </p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
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
                      {/* Password strength */}
                      {password.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-1">
                            {Array.from({ length: passwordStrength.total }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-1.5 flex-1 rounded-full transition-colors",
                                  i < passwordStrength.passed
                                    ? passwordStrength.passed <= 2 ? "bg-destructive"
                                    : passwordStrength.passed <= 3 ? "bg-amber-500"
                                    : "bg-green-500"
                                    : "bg-muted"
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
                                <span className={rule.ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                                  {rule.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirmar Contraseña</Label>
                      <Input
                        id="reg-confirm"
                        type={showPassword ? "text" : "password"}
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

                    <Button
                      type="submit"
                      className="w-full text-base h-11"
                      disabled={loading || !isPasswordValid || !passwordsMatch}
                    >
                      {loading ? "Creando cuenta..." : "Crear Cuenta Gratis"}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Al registrarte, recibirás un email de confirmación para activar tu cuenta.
                    </p>
                  </form>

                  <div className="mt-6 pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      ¿Ya tienes cuenta?{" "}
                      <Link to="/login" className="text-primary font-medium hover:underline">
                        Inicia sesión
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
