import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  MoreHorizontal,
  User,
  Info,
  Bell,
  Dumbbell,
  FileBarChart,
  Shield,
  BarChart3,
  UserCheck,
  LogOut,
  Crown,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useClinic } from "@/hooks/useClinic";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ReminderPanel } from "@/components/reminders/ReminderPanel";

const mainNav = [
  { name: "Calendario", href: "/", icon: Calendar },
  { name: "Pacientes", href: "/pacientes", icon: Users },
  { name: "Tests", href: "/tests", icon: ClipboardList },
  { name: "Planif.", href: "/planificaciones", icon: FileText },
  { name: "Más", href: "#more", icon: MoreHorizontal },
];

const moreNav = [
  { name: "Recordatorios", href: "/recordatorios", icon: Bell, adminOnly: false, clinicOnly: false },
  { name: "Ejercicios", href: "/ejercicios", icon: Dumbbell, adminOnly: false, clinicOnly: false },
  { name: "Reportes", href: "/reportes", icon: FileBarChart, adminOnly: false, clinicOnly: false },
  { name: "Pagos", href: "/pagos", icon: CreditCard, adminOnly: false, clinicOnly: false },
  { name: "Planes", href: "/planes", icon: Crown, adminOnly: false, clinicOnly: false },
  { name: "Clínica", href: "/clinica", icon: Building, adminOnly: false, clinicOnly: true },
  { name: "Mi Perfil", href: "/perfil", icon: User, adminOnly: false, clinicOnly: false },
  { name: "Auditoría", href: "/auditoria", icon: Shield, adminOnly: true, clinicOnly: false },
  { name: "Insights", href: "/insights", icon: BarChart3, adminOnly: true, clinicOnly: false },
  { name: "Usuarios", href: "/admin/users", icon: UserCheck, adminOnly: true, clinicOnly: false },
  { name: "Legal", href: "/legal", icon: Info, adminOnly: false, clinicOnly: false },
];

export function BottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isClinicMember, pendingInvitations } = useClinic();
  const { effectivePlan } = useSubscription();
  const showClinic = isClinicMember || pendingInvitations.length > 0 || effectivePlan === 'clinic' || effectivePlan === 'vip' || isAdmin;
  const [showMore, setShowMore] = useState(false);

  const filteredMoreNav = moreNav.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.clinicOnly && !showClinic) return false;
    return true;
  });

  const isMoreActive = filteredMoreNav.some(item => location.pathname === item.href);

  return (
    <>
      {/* "Más" overlay menu */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-card border-t border-border shadow-lg rounded-t-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-sm font-semibold text-muted-foreground">Más opciones</span>
                <div className="flex items-center gap-1">
                  <ReminderPanel />
                  <ThemeSwitcher />
                </div>
              </div>
              {filteredMoreNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setShowMore(false);
                  signOut();
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {mainNav.map((item) => {
            const isMore = item.href === "#more";
            const isActive = isMore
              ? isMoreActive || showMore
              : location.pathname === item.href;

            if (isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-full w-8 h-8 transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
