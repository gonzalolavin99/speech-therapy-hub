import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuditLog, formatAuditAction, formatEntityType } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Search, 
  RefreshCw, 
  User, 
  FileText, 
  Calendar,
  Activity,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TableSkeleton } from "@/components/ui/skeleton-card";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export default function AuditLogs() {
  const { getLogs } = useAuditLog();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    const data = await getLogs({ limit: 100 });
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (filterEntity !== "all" && log.entity_type !== filterEntity) return false;
    if (searchQuery && !log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'CREATE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'UPDATE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'READ': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'EXPORT': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'LOGIN': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'LOGOUT': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'CONSENT_SIGNED': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'TEST_COMPLETED': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getEntityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'patient': <User className="h-4 w-4" />,
      'session': <Calendar className="h-4 w-4" />,
      'test': <FileText className="h-4 w-4" />,
      'consent': <Shield className="h-4 w-4" />,
      'user': <User className="h-4 w-4" />,
    };
    return icons[type] || <Activity className="h-4 w-4" />;
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Logs de Auditoría</h1>
              <p className="text-sm text-muted-foreground">
                Registro de todas las acciones realizadas en el sistema
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="CREATE">Crear</SelectItem>
                  <SelectItem value="UPDATE">Actualizar</SelectItem>
                  <SelectItem value="DELETE">Eliminar</SelectItem>
                  <SelectItem value="EXPORT">Exportar</SelectItem>
                  <SelectItem value="CONSENT_SIGNED">Consentimiento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  <SelectItem value="patient">Pacientes</SelectItem>
                  <SelectItem value="session">Sesiones</SelectItem>
                  <SelectItem value="test">Evaluaciones</SelectItem>
                  <SelectItem value="consent">Consentimientos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Historial de Actividad
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={8} />
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay registros de auditoría</p>
                <p className="text-sm">Las acciones realizadas aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getEntityIcon(log.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionColor(log.action)}>
                          {formatAuditAction(log.action)}
                        </Badge>
                        <Badge variant="outline">
                          {formatEntityType(log.entity_type)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {log.entity_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user_email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{format(new Date(log.created_at), "d MMM yyyy", { locale: es })}</p>
                      <p>{format(new Date(log.created_at), "HH:mm:ss")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-primary">Cumplimiento Legal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Este registro de auditoría cumple con los requisitos de la Ley 19.628 sobre protección 
                  de datos personales y la Ley 20.584 sobre derechos de los pacientes. Todos los accesos 
                  y modificaciones a datos sensibles quedan registrados para garantizar la trazabilidad.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
