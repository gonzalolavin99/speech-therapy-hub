import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useProfile } from "@/hooks/useProfile";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { needsOnboarding, isLoading } = useProfile();
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  
  // Activar timeout de sesión por inactividad
  useSessionTimeout();

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AppSidebar />}
      <main className={cn(
        "transition-all duration-300",
        isMobile ? "pl-0 pb-16" : isCollapsed ? "pl-16" : "pl-64"
      )}>
        <div className="min-h-screen">{children}</div>
      </main>
      {isMobile && <BottomNav />}
      {!isLoading && <OnboardingDialog open={needsOnboarding} />}
    </div>
  );
}
