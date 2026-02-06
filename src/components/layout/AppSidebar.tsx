import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  User,
  Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Calendario", href: "/", icon: Calendar },
  { name: "Pacientes", href: "/pacientes", icon: Users },
  { name: "Tests", href: "/tests", icon: ClipboardList },
  { name: "Planificaciones", href: "/planificaciones", icon: FileText },
  { name: "Pagos", href: "/pagos", icon: CreditCard },
  { name: "Mi Perfil", href: "/perfil", icon: User },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Mic2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">FonoApp</h1>
            <p className="text-xs text-muted-foreground">Gestión Clínica</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Fonoaudióloga
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Plan Profesional
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
