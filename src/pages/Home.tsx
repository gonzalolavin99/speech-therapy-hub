import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const LandingPage = lazy(() => import("@/components/landing/LandingPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user?.email_confirmed_at) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Dashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
}
