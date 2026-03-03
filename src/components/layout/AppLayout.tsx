import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { PendingApproval } from "@/components/PendingApproval";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { useProfile } from "@/hooks/useProfile";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdmin } from "@/hooks/useAdmin";
import { useTour } from "@/hooks/useTour";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { profile, needsOnboarding, isLoading } = useProfile();
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const { isAdmin } = useAdmin();
  const { showTour, completeTour } = useTour(user?.id);
  
  // Activar timeout de sesión por inactividad
  useSessionTimeout();

  // Show pending approval screen if onboarding done but not approved (admins bypass)
  const pendingApproval = !isLoading && profile?.onboarding_completed && !profile?.approved && !isAdmin;

  if (pendingApproval) {
    return <PendingApproval />;
  }

  // Show tour only when onboarding is done, user approved, and tour not yet completed
  const shouldShowTour = !isLoading && !needsOnboarding && profile?.approved && showTour;

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AppSidebar />}
      <main id="main-content" className={cn(
        "transition-all duration-300",
        isMobile ? "pl-0 pb-16" : isCollapsed ? "pl-16" : "pl-64"
      )}>
        <div className="min-h-screen">{children}</div>
      </main>
      {isMobile && <BottomNav />}
      {!isLoading && <OnboardingDialog open={needsOnboarding} />}
      <GuidedTour open={!!shouldShowTour} onComplete={completeTour} />
    </div>
  );
}
