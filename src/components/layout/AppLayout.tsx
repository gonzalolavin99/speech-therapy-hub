import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useProfile } from "@/hooks/useProfile";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { needsOnboarding, isLoading } = useProfile();
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={cn(
        "transition-all duration-300",
        isCollapsed ? "pl-16" : "pl-64"
      )}>
        <div className="min-h-screen">{children}</div>
      </main>
      {!isLoading && <OnboardingDialog open={needsOnboarding} />}
    </div>
  );
}
