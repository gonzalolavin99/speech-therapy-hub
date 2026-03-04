import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  User,
  Mic2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  BarChart3,
  UserCheck,
  Crown,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ReminderPanel } from "@/components/reminders/ReminderPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useClinic } from "@/hooks/useClinic";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
  { name: "Calendario", href: "/", icon: Calendar, adminOnly: false, clinicOnly: false },
  { name: "Pacientes", href: "/pacientes", icon: Users, adminOnly: false, clinicOnly: false },
  { name: "Tests", href: "/tests", icon: ClipboardList, adminOnly: false, clinicOnly: false },
  { name: "Planificaciones", href: "/planificaciones", icon: FileText, adminOnly: false, clinicOnly: false },
  { name: "Pagos", href: "/pagos", icon: CreditCard, adminOnly: false, clinicOnly: false },
  { name: "Planes", href: "/planes", icon: Crown, adminOnly: false, clinicOnly: false },
  { name: "Clínica", href: "/clinica", icon: Building, adminOnly: false, clinicOnly: true },
  { name: "Mi Perfil", href: "/perfil", icon: User, adminOnly: false, clinicOnly: false },
  { name: "Auditoría", href: "/auditoria", icon: Shield, adminOnly: true, clinicOnly: false },
  { name: "Insights", href: "/insights", icon: BarChart3, adminOnly: true, clinicOnly: false },
  { name: "Usuarios", href: "/admin/users", icon: UserCheck, adminOnly: true, clinicOnly: false },
  { name: "Legal", href: "/legal", icon: Info, adminOnly: false, clinicOnly: false },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isCollapsed, toggle } = useSidebar();
  const { isAdmin } = useAdmin();
  const { isClinicMember, pendingInvitations } = useClinic();
  const { effectivePlan } = useSubscription();
  const showClinic = isClinicMember || pendingInvitations.length > 0 || effectivePlan === 'clinic' || effectivePlan === 'vip' || isAdmin;

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.clinicOnly && !showClinic) return false;
    return true;
  });

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          isCollapsed ? "justify-center px-2" : "gap-3 px-4"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary flex-shrink-0">
            <Mic2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-sidebar-foreground truncate">TherapyHub</h1>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className={cn("flex items-center border-b border-sidebar-border", isCollapsed ? "justify-center py-2" : "justify-between px-3 py-2")}>
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <ReminderPanel />
              <ThemeSwitcher />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const linkContent = (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                  isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-2">
          {isCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex justify-center py-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.email || 'Usuario'}
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Cerrar Sesión
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'Plan Profesional'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
