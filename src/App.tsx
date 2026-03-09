import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ProfessionProvider } from "@/contexts/ProfessionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pacientes = lazy(() => import("./pages/Pacientes"));
const Tests = lazy(() => import("./pages/Tests"));
const Planificaciones = lazy(() => import("./pages/Planificaciones"));
const Pagos = lazy(() => import("./pages/Pagos"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Legal = lazy(() => import("./pages/Legal"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Planes = lazy(() => import("./pages/Planes"));
const Clinica = lazy(() => import("./pages/Clinica"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PatientPortal = lazy(() => import("./pages/PatientPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - prevents unnecessary refetches
      gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfessionProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
              <Route path="/tests" element={<ProtectedRoute><Tests /></ProtectedRoute>} />
              <Route path="/planificaciones" element={<ProtectedRoute><Planificaciones /></ProtectedRoute>} />
              <Route path="/pagos" element={<ProtectedRoute><Pagos /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/legal" element={<ProtectedRoute><Legal /></ProtectedRoute>} />
              <Route path="/auditoria" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              <Route path="/insights" element={<AdminRoute><AdminInsights /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/planes" element={<ProtectedRoute><Planes /></ProtectedRoute>} />
              <Route path="/clinica" element={<ProtectedRoute><Clinica /></ProtectedRoute>} />
              {/* Public routes (no auth required) */}
              <Route path="/p/:slug" element={<PublicProfile />} />
              <Route path="/portal/:token" element={<PatientPortal />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </SidebarProvider>
        </ProfessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
