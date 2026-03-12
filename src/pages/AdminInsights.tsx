import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformMPConfig } from "@/components/admin/PlatformMPConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  Lightbulb,
  Layout,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { generateAdminInsights, isAIConfigured, AdminInsightResult } from "@/lib/ai-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

interface UsageStats {
  totalLogs: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  topUsers: { email: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Crear",
  UPDATE: "Actualizar",
  DELETE: "Eliminar",
  EXPORT: "Exportar",
  READ: "Visualizar",
  LOGIN: "Login",
  LOGOUT: "Logout",
  CONSENT_SIGNED: "Consentimiento",
  TEST_COMPLETED: "Test completado",
};

const ENTITY_LABELS: Record<string, string> = {
  patient: "Pacientes",
  session: "Sesiones",
  test: "Tests",
  payment: "Pagos",
  consent: "Consentimientos",
  user: "Usuarios",
  planning: "Planificaciones",
};

export default function AdminInsights() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AdminInsightResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  // Incomplete flows data
  const [patientsWithoutPlanning, setPatientsWithoutPlanning] = useState(0);
  const [planningsWithoutSessions, setPlanningsWithoutSessions] = useState(0);
  const [unpaidPayments, setUnpaidPayments] = useState(0);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Fetch audit logs
    const { data: logsData } = await supabase
      .from("audit_logs")
      .select("id, user_email, action, entity_type, entity_name, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    setLogs((logsData as AuditLog[]) || []);

    // Compute incomplete flows with direct queries
    const [allPatientsRes, plannedPatientsRes, activePlanningsRes, pendingPaymentsRes] = await Promise.all([
      supabase.from("patients").select("id").eq("status", "active"),
      supabase.from("plannings").select("patient_id"),
      supabase.from("plannings").select("id, completed_sessions").eq("status", "active"),
      supabase.from("payments").select("id", { count: "exact" }).eq("status", "pending"),
    ]);

    const plannedIds = new Set((plannedPatientsRes.data || []).map((p: any) => p.patient_id));
    setPatientsWithoutPlanning((allPatientsRes.data || []).filter((p: any) => !plannedIds.has(p.id)).length);
    setPlanningsWithoutSessions((activePlanningsRes.data || []).filter((p: any) => p.completed_sessions === 0).length);
    setUnpaidPayments(pendingPaymentsRes.count || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, periodDays]);

  // Compute stats from logs
  const stats: UsageStats = useMemo(() => {
    const actionBreakdown: Record<string, number> = {};
    const entityBreakdown: Record<string, number> = {};
    const hourlyDistribution: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    for (const log of logs) {
      // Actions
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      // Entities
      entityBreakdown[log.entity_type] = (entityBreakdown[log.entity_type] || 0) + 1;
      // Hourly
      const hour = new Date(log.created_at).getHours().toString().padStart(2, "0");
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      // Users
      userCounts[log.user_email] = (userCounts[log.user_email] || 0) + 1;
      // Daily
      const day = format(new Date(log.created_at), "yyyy-MM-dd");
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    const dailyActivity = Object.entries(dailyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    return {
      totalLogs: logs.length,
      uniqueUsers: new Set(logs.map((l) => l.user_email)).size,
      actionBreakdown,
      entityBreakdown,
      hourlyDistribution,
      topUsers,
      dailyActivity,
    };
  }, [logs]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await generateAdminInsights({
        ...stats,
        patientsWithoutPlanning,
        planningsWithoutSessions,
        unpaidPayments,
        periodDays,
      });
      setAiInsights(result);
      toast.success("Análisis de IA completado");
    } catch (err: any) {
      toast.error("Error al analizar", { description: err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper: simple horizontal bar
  const Bar = ({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) => (
    <div className="w-full h-5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${max > 0 ? Math.max((value / max) * 100, 4) : 0}%` }}
      />
    </div>
  );

  const maxAction = Math.max(...Object.values(stats.actionBreakdown), 1);
  const maxEntity = Math.max(...Object.values(stats.entityBreakdown), 1);
  const maxHourly = Math.max(...Object.values(stats.hourlyDistribution), 1);

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Panel de Insights</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Análisis de uso y sugerencias para mejorar la app
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriodDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    periodDays === d
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalLogs}</p>
                      <p className="text-xs text-muted-foreground">Acciones totales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                      <p className="text-xs text-muted-foreground">Usuarios activos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{patientsWithoutPlanning}</p>
                      <p className="text-xs text-muted-foreground">Sin planificación</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{unpaidPayments}</p>
                      <p className="text-xs text-muted-foreground">Pagos pendientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Actions Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Acciones por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.actionBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([action, count]) => (
                      <div key={action} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{ACTION_LABELS[action] || action}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <Bar value={count} max={maxAction} />
                      </div>
                    ))}
                  {Object.keys(stats.actionBreakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  )}
                </CardContent>
              </Card>

              {/* Entity Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Uso por Sección
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.entityBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([entity, count]) => (
                      <div key={entity} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{ENTITY_LABELS[entity] || entity}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <Bar value={count} max={maxEntity} color="bg-violet-500" />
                      </div>
                    ))}
                  {Object.keys(stats.entityBreakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Hourly + Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Distribución Horaria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(stats.hourlyDistribution).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos de actividad en este período</p>
                  ) : (
                    <>
                      <div className="flex items-end gap-[3px] h-32">
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, "0");
                          const count = stats.hourlyDistribution[hour] || 0;
                          const heightPx = maxHourly > 0 ? Math.max((count / maxHourly) * 128, count > 0 ? 4 : 1) : 1;
                          return (
                            <div key={hour} className="flex-1 h-full flex flex-col justify-end items-center" title={`${hour}:00 — ${count} acciones`}>
                              <div
                                className="w-full rounded-t transition-all duration-500"
                                style={{
                                  height: `${heightPx}px`,
                                  backgroundColor: count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">00:00</span>
                        <span className="text-[10px] text-muted-foreground">06:00</span>
                        <span className="text-[10px] text-muted-foreground">12:00</span>
                        <span className="text-[10px] text-muted-foreground">18:00</span>
                        <span className="text-[10px] text-muted-foreground">23:00</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Top Users + Incomplete Flows */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Usuarios Más Activos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats.topUsers.map((u, i) => (
                    <div key={u.email} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm truncate flex-1">{u.email}</span>
                      <Badge variant="secondary" className="text-xs">{u.count}</Badge>
                    </div>
                  ))}
                  {stats.topUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
                  )}

                  {/* Incomplete Flows */}
                  <div className="border-t pt-3 mt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flujos Incompletos</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{patientsWithoutPlanning} pacientes sin planificación</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{planningsWithoutSessions} planificaciones sin sesiones</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>{unpaidPayments} pagos pendientes</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis Section */}
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    Análisis con IA
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !isAIConfigured()}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isAnalyzing ? "Analizando..." : "Analizar con IA"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!isAIConfigured() ? (
                  <p className="text-sm text-muted-foreground">
                    Configura tu API key de OpenAI (VITE_OPENAI_API_KEY) para habilitar el análisis con IA.
                  </p>
                ) : !aiInsights ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Haz clic en "Analizar con IA" para obtener insights</p>
                    <p className="text-xs mt-1">La IA analizará las estadísticas de uso y generará sugerencias</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Resumen */}
                    <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-4 border border-violet-100 dark:border-violet-900/30">
                      <p className="text-sm text-card-foreground">{aiInsights.resumen}</p>
                    </div>

                    {/* Hallazgos */}
                    {aiInsights.hallazgos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" /> Hallazgos Clave
                        </h4>
                        <div className="space-y-2">
                          {aiInsights.hallazgos.map((h, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sugerencias de mejora */}
                    {aiInsights.sugerenciasMejora.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5" /> Sugerencias de Mejora
                        </h4>
                        <div className="space-y-2">
                          {aiInsights.sugerenciasMejora.map((s, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Flujos incompletos */}
                    {aiInsights.flujosIncompletos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Flujos Incompletos
                        </h4>
                        <div className="space-y-2">
                          {aiInsights.flujosIncompletos.map((f, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendaciones UX */}
                    {aiInsights.recomendacionesUX.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Layout className="h-3.5 w-3.5" /> Recomendaciones UX
                        </h4>
                        <div className="space-y-2">
                          {aiInsights.recomendacionesUX.map((r, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Platform Payment Config */}
        <PlatformMPConfig />
      </div>
    </AppLayout>
  );
}
