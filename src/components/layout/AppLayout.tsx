import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useProfile } from "@/hooks/useProfile";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { needsOnboarding, isLoading } = useProfile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
      {!isLoading && <OnboardingDialog open={needsOnboarding} />}
    </div>
  );
}
