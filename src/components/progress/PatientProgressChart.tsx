import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Session } from "@/hooks/useSessions";
import { Planning } from "@/hooks/usePlannings";
import { TrendingUp, TrendingDown, Minus, Calendar, Target, CheckCircle2, XCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientProgressChartProps {
  sessions: Session[];
  plannings: Planning[];
  patientId: string;
  patientName: string;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#3b82f6",
  muted: "#94a3b8",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#94a3b8"];

export function PatientProgressChart({
  sessions,
  plannings,
  patientId,
  patientName,
}: PatientProgressChartProps) {
  const patientSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.patient_id === patientId)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [sessions, patientId]
  );

  const patientPlannings = useMemo(
    () => plannings.filter((p) => p.patient_id === patientId),
    [plannings, patientId]
  );

  // Monthly session frequency data
  const monthlyData = useMemo(() => {
    const months: Record<string, { completed: number; cancelled: number; noShow: number; total: number }> = {};

    patientSessions.forEach((s) => {
      const date = new Date(s.start_time);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { completed: 0, cancelled: 0, noShow: 0, total: 0 };
      months[key].total++;
      if (s.status === "completed") months[key].completed++;
      else if (s.status === "cancelled") months[key].cancelled++;
      else if (s.status === "no_show") months[key].noShow++;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [y, m] = key.split("-");
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return {
          month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
          ...val,
        };
      });
  }, [patientSessions]);

  // Cumulative progress
  const cumulativeData = useMemo(() => {
    let cumCompleted = 0;
    return patientSessions
      .filter((s) => s.status === "completed")
      .map((s, i) => {
        cumCompleted++;
        return {
          session: i + 1,
          date: new Date(s.start_time).toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
          completed: cumCompleted,
        };
      });
  }, [patientSessions]);

  // Session status distribution
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    patientSessions.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    const statusLabels: Record<string, string> = {
      completed: "Completadas",
      scheduled: "Agendadas",
      confirmed: "Confirmadas",
      cancelled: "Canceladas",
      no_show: "No asistió",
    };
    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      status,
    }));
  }, [patientSessions]);

  // Key metrics
  const metrics = useMemo(() => {
    const completed = patientSessions.filter((s) => s.status === "completed").length;
    const total = patientSessions.length;
    const cancelled = patientSessions.filter((s) => s.status === "cancelled" || s.status === "no_show").length;
    const attendanceRate = total > 0 ? Math.round(((total - cancelled) / total) * 100) : 0;
    const totalPlannedSessions = patientPlannings.reduce((sum, p) => sum + p.total_sessions, 0);
    const totalCompletedInPlannings = patientPlannings.reduce((sum, p) => sum + p.completed_sessions, 0);
    const planningProgress = totalPlannedSessions > 0 ? Math.round((totalCompletedInPlannings / totalPlannedSessions) * 100) : 0;

    // Trend: compare last 4 weeks vs prior 4 weeks
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
    const recentSessions = patientSessions.filter((s) => new Date(s.start_time) >= fourWeeksAgo && s.status === "completed").length;
    const priorSessions = patientSessions.filter(
      (s) => new Date(s.start_time) >= eightWeeksAgo && new Date(s.start_time) < fourWeeksAgo && s.status === "completed"
    ).length;
    const trend = recentSessions > priorSessions ? "up" : recentSessions < priorSessions ? "down" : "stable";

    return { completed, total, cancelled, attendanceRate, totalPlannedSessions, totalCompletedInPlannings, planningProgress, trend, recentSessions, priorSessions };
  }, [patientSessions, patientPlannings]);

  if (patientSessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center">
        <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Sin datos de progreso</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Registra sesiones para ver los gráficos de evolución</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sesiones completadas"
          value={metrics.completed}
          subtext={`de ${metrics.total} total`}
          color="text-success"
          bgColor="bg-success/10"
        />
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Progreso planificación"
          value={`${metrics.planningProgress}%`}
          subtext={`${metrics.totalCompletedInPlannings}/${metrics.totalPlannedSessions} sesiones`}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4" />}
          label="Asistencia"
          value={`${metrics.attendanceRate}%`}
          subtext={`${metrics.cancelled} cancelaciones`}
          color={metrics.attendanceRate >= 80 ? "text-success" : metrics.attendanceRate >= 60 ? "text-warning" : "text-destructive"}
          bgColor={metrics.attendanceRate >= 80 ? "bg-success/10" : metrics.attendanceRate >= 60 ? "bg-warning/10" : "bg-destructive/10"}
        />
        <MetricCard
          icon={
            metrics.trend === "up" ? <TrendingUp className="h-4 w-4" /> :
            metrics.trend === "down" ? <TrendingDown className="h-4 w-4" /> :
            <Minus className="h-4 w-4" />
          }
          label="Tendencia (4 sem)"
          value={
            metrics.trend === "up" ? "En alza" :
            metrics.trend === "down" ? "Bajando" : "Estable"
          }
          subtext={`${metrics.recentSessions} vs ${metrics.priorSessions} previas`}
          color={metrics.trend === "up" ? "text-success" : metrics.trend === "down" ? "text-warning" : "text-info"}
          bgColor={metrics.trend === "up" ? "bg-success/10" : metrics.trend === "down" ? "bg-warning/10" : "bg-info/10"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative Progress */}
        {cumulativeData.length >= 2 && (
          <div className="bg-card rounded-xl border p-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-4">Progreso Acumulado</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} sesiones`, "Completadas"]}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Frequency */}
        {monthlyData.length >= 1 && (
          <div className="bg-card rounded-xl border p-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-4">Sesiones por Mes</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="completed" fill="#22c55e" name="Completadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" fill="#ef4444" name="Canceladas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noShow" fill="#f59e0b" name="No asistió" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status Distribution Pie + Planning Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {statusDistribution.length > 0 && (
          <div className="bg-card rounded-xl border p-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-4">Distribución de Sesiones</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => {
                    const colorMap: Record<string, string> = {
                      completed: "#22c55e",
                      scheduled: "#3b82f6",
                      confirmed: "#6366f1",
                      cancelled: "#ef4444",
                      no_show: "#f59e0b",
                    };
                    return <Cell key={`cell-${index}`} fill={colorMap[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Planning Progress Bars */}
        {patientPlannings.length > 0 && (
          <div className="bg-card rounded-xl border p-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-4">Progreso por Planificación</h4>
            <div className="space-y-4">
              {patientPlannings.map((planning) => {
                const progress = planning.total_sessions > 0
                  ? Math.round((planning.completed_sessions / planning.total_sessions) * 100)
                  : 0;
                return (
                  <div key={planning.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-card-foreground truncate max-w-[200px]">
                        {planning.intervention_approach}
                      </p>
                      <span className={cn(
                        "text-xs font-semibold",
                        progress === 100 ? "text-success" : progress >= 50 ? "text-info" : "text-warning"
                      )}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progress === 100 ? "bg-success" : progress >= 50 ? "bg-info" : "bg-warning"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {planning.completed_sessions} de {planning.total_sessions} sesiones • {planning.method}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-3">
      <div className={cn("inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2", bgColor, color)}>
        {icon}
      </div>
      <p className="text-lg md:text-xl font-bold text-card-foreground">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{subtext}</p>
    </div>
  );
}
