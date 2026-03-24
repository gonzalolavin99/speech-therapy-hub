import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Users,
  CalendarCheck,
  DollarSign,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { useSessions } from "@/hooks/useSessions";
import { useTestResults } from "@/hooks/useTestResults";
import { usePlannings } from "@/hooks/usePlannings";
import { usePayments } from "@/hooks/usePayments";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { subMonths, format, startOfMonth, isAfter, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

const PERIOD_OPTIONS = [
  { label: "3 meses", value: 3 },
  { label: "6 meses", value: 6 },
  { label: "12 meses", value: 12 },
];

const COLORS = {
  primary: "hsl(204, 22%, 50%)",
  success: "hsl(158, 64%, 40%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 84%, 60%)",
  info: "hsl(250, 55%, 58%)",
  muted: "hsl(215, 20%, 65%)",
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.destructive, COLORS.info, COLORS.muted];

const SESSION_TYPE_LABELS: Record<string, string> = {
  evaluation: "Evaluación",
  therapy: "Terapia",
  followup: "Seguimiento",
};

const PATIENT_STATUS_LABELS: Record<string, string> = {
  active: "Activos",
  inactive: "Inactivos",
  completed: "Alta",
};

const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);

export default function Estadisticas() {
  const [period, setPeriod] = useState(6);

  const { patients } = usePatients();
  const { sessions } = useSessions();
  const { testResults } = useTestResults();
  const { plannings } = usePlannings();
  const { payments } = usePayments();

  const now = new Date();
  const periodStart = subMonths(now, period);

  // ==================== KPIs ====================
  const activePatients = patients.filter((p) => p.status === "active").length;

  const periodSessions = sessions.filter((s) => isAfter(new Date(s.start_time), periodStart));
  const completedSessions = periodSessions.filter((s) => s.status === "completed").length;
  const totalRelevantSessions = periodSessions.filter(
    (s) => s.status === "completed" || s.status === "cancelled" || s.status === "no_show"
  ).length;
  const attendanceRate = totalRelevantSessions > 0 ? Math.round((completedSessions / totalRelevantSessions) * 100) : 0;

  const currentMonthStart = startOfMonth(now);
  const monthRevenue = payments
    .filter((p) => p.status === "paid" && p.payment_date && isAfter(new Date(p.payment_date), currentMonthStart))
    .reduce((sum, p) => sum + p.amount, 0);

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.start_time);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  }).length;

  // ==================== SESSIONS BY MONTH ====================
  const sessionsByMonth = useMemo(() => {
    const months: Record<string, { month: string; completadas: number; canceladas: number; inasistencias: number }> = {};

    for (let i = period - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy", { locale: es });
      months[key] = { month: label, completadas: 0, canceladas: 0, inasistencias: 0 };
    }

    periodSessions.forEach((s) => {
      const key = format(new Date(s.start_time), "yyyy-MM");
      if (!months[key]) return;
      if (s.status === "completed") months[key].completadas++;
      else if (s.status === "cancelled") months[key].canceladas++;
      else if (s.status === "no_show") months[key].inasistencias++;
    });

    return Object.values(months);
  }, [sessions, period]);

  // ==================== REVENUE BY MONTH ====================
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { month: string; ingresos: number }> = {};

    for (let i = period - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy", { locale: es });
      months[key] = { month: label, ingresos: 0 };
    }

    payments
      .filter((p) => p.status === "paid" && p.payment_date)
      .forEach((p) => {
        const key = format(new Date(p.payment_date!), "yyyy-MM");
        if (months[key]) months[key].ingresos += p.amount;
      });

    return Object.values(months);
  }, [payments, period]);

  // ==================== SESSION TYPE DISTRIBUTION ====================
  const sessionTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    periodSessions.forEach((s) => {
      counts[s.session_type] = (counts[s.session_type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: SESSION_TYPE_LABELS[type] || type,
      value: count,
    }));
  }, [sessions, period]);

  // ==================== PATIENT STATUS DISTRIBUTION ====================
  const patientStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: PATIENT_STATUS_LABELS[status] || status,
      value: count,
    }));
  }, [patients]);

  // ==================== TESTS BY TYPE ====================
  const testsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    testResults
      .filter((t) => isAfter(new Date(t.evaluation_date), periodStart))
      .forEach((t) => {
        const name = t.test_name || t.test_type;
        counts[name] = (counts[name] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [testResults, period]);

  // ==================== PLANNING PROGRESS ====================
  const planningProgress = useMemo(() => {
    return plannings
      .filter((p) => p.status === "active")
      .map((p) => {
        const completedCount = sessions.filter(
          (s) => s.planning_id === p.id && s.status === "completed"
        ).length;
        const progress = p.total_sessions > 0 ? Math.round((completedCount / p.total_sessions) * 100) : 0;
        return {
          name: p.patient_name || "Paciente",
          progreso: progress,
          completadas: completedCount,
          total: p.total_sessions,
        };
      })
      .sort((a, b) => b.progreso - a.progreso);
  }, [plannings, sessions]);

  // ==================== CUSTOM TOOLTIP ====================
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-popover-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" && entry.name?.includes("ngreso")
              ? formatCLP(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Estadísticas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualiza el rendimiento de tu práctica profesional
            </p>
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs px-3",
                  period === opt.value && "bg-background shadow-sm text-foreground"
                )}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Pacientes Activos"
            value={activePatients}
            description={`${patients.length} total`}
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Tasa de Asistencia"
            value={`${attendanceRate}%`}
            description={`${completedSessions} de ${totalRelevantSessions} sesiones`}
            icon={CalendarCheck}
            variant="success"
          />
          <StatsCard
            title="Ingresos del Mes"
            value={formatCLP(monthRevenue)}
            icon={DollarSign}
            variant="warning"
          />
          <StatsCard
            title="Sesiones esta Semana"
            value={weekSessions}
            icon={CalendarDays}
            variant="info"
          />
        </div>

        {/* Charts Row 1: Sessions + Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sessions by Month */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Sesiones por Mes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionsByMonth} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="completadas" name="Completadas" fill={COLORS.success} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="canceladas" name="Canceladas" fill={COLORS.destructive} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="inasistencias" name="Inasistencias" fill={COLORS.warning} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Month */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Ingresos por Mes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByMonth}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Ingresos"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Session Type Distribution */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Tipo de Sesión</h3>
            <div className="h-56">
              {sessionTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={PieLabel}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {sessionTypeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos en el período
                </div>
              )}
            </div>
          </div>

          {/* Patient Status Distribution */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Estado de Pacientes</h3>
            <div className="h-56">
              {patientStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patientStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={PieLabel}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {patientStatusData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin pacientes
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 3: Tests + Plannings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tests by Type */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Evaluaciones Aplicadas</h3>
            <div className="h-64">
              {testsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testsByType} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Aplicaciones" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin evaluaciones en el período
                </div>
              )}
            </div>
          </div>

          {/* Planning Progress */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Progreso de Planificaciones</h3>
            <div className="h-64">
              {planningProgress.length > 0 ? (
                <div className="space-y-3 overflow-y-auto h-full pr-1">
                  {planningProgress.map((p, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-card-foreground truncate max-w-[60%]">
                          {p.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.completadas}/{p.total} ({p.progreso}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(p.progreso, 100)}%`,
                            backgroundColor:
                              p.progreso >= 100
                                ? COLORS.success
                                : p.progreso >= 50
                                ? COLORS.primary
                                : COLORS.warning,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin planificaciones activas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
