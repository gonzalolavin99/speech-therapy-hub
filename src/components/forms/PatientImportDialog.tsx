import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calcularEdadEnAños } from "@/utils/age";

interface ImportedPatient {
  name: string;
  rut: string;
  phone?: string;
  email?: string;
  diagnosis?: string;
  birth_date?: string;
  status?: string;
  consult_reason?: string;
  referred_by?: string;
  observations?: string;
}

interface ParsedRow {
  data: ImportedPatient;
  errors: string[];
  rowNumber: number;
}

interface PatientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (patients: ImportedPatient[]) => Promise<void>;
  existingRuts: string[];
}

function validateRut(rut: string): boolean {
  if (!rut || rut === 'Por completar') return true; // Allow placeholder
  const cleaned = rut.replace(/\./g, '').replace(/-/g, '').trim();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();
  return dv === expectedDv;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  // Last field
  currentRow.push(currentField.trim());
  if (currentRow.some(f => f !== '')) rows.push(currentRow);

  return rows;
}

const EXPECTED_HEADERS: Record<string, string> = {
  nombre: 'name',
  name: 'name',
  rut: 'rut',
  telefono: 'phone',
  phone: 'phone',
  celular: 'phone',
  email: 'email',
  correo: 'email',
  diagnostico: 'diagnosis',
  diagnosis: 'diagnosis',
  fecha_nacimiento: 'birth_date',
  birth_date: 'birth_date',
  nacimiento: 'birth_date',
  estado: 'status',
  status: 'status',
  motivo_consulta: 'consult_reason',
  consult_reason: 'consult_reason',
  derivado_por: 'referred_by',
  referred_by: 'referred_by',
  observaciones: 'observations',
  observations: 'observations',
};

function mapHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().replace(/[áéíóú]/g, m => {
      const map: Record<string, string> = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
      return map[m] || m;
    }).replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (EXPECTED_HEADERS[normalized]) {
      mapping[i] = EXPECTED_HEADERS[normalized];
    }
  });
  return mapping;
}

function parseRows(rows: string[][], headerMapping: Record<number, string>, existingRuts: string[]): ParsedRow[] {
  return rows.map((row, idx) => {
    const data: Record<string, string> = {};
    const errors: string[] = [];

    Object.entries(headerMapping).forEach(([colIdx, field]) => {
      const value = row[parseInt(colIdx)] || '';
      data[field] = value;
    });

    // Validation
    if (!data.name?.trim()) {
      errors.push('Nombre es requerido');
    }
    if (!data.rut?.trim()) {
      data.rut = 'Por completar';
    } else if (!validateRut(data.rut)) {
      errors.push(`RUT inválido: ${data.rut}`);
    }
    if (data.rut && data.rut !== 'Por completar' && existingRuts.includes(data.rut.replace(/\./g, '').replace(/-/g, '').trim())) {
      errors.push(`RUT duplicado (ya existe): ${data.rut}`);
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push(`Email inválido: ${data.email}`);
    }
    if (data.birth_date) {
      const parsed = new Date(data.birth_date);
      if (isNaN(parsed.getTime())) {
        errors.push(`Fecha inválida: ${data.birth_date}`);
        data.birth_date = '';
      } else {
        data.birth_date = parsed.toISOString().split('T')[0];
      }
    }
    if (data.status && !['active', 'inactive', 'completed', 'activo', 'inactivo', 'completado'].includes(data.status.toLowerCase())) {
      data.status = 'active';
    } else if (data.status) {
      const statusMap: Record<string, string> = { activo: 'active', inactivo: 'inactive', completado: 'completed' };
      data.status = statusMap[data.status.toLowerCase()] || data.status.toLowerCase();
    }

    return {
      data: data as unknown as ImportedPatient,
      errors,
      rowNumber: idx + 2, // +2 because row 1 is headers, idx is 0-based
    };
  });
}

export function PatientImportDialog({
  open,
  onOpenChange,
  onImport,
  existingRuts,
}: PatientImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setImportResults({ success: 0, errors: 0 });
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processCSV = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return;
    }

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const headerMapping = mapHeaders(headerRow);

    if (!Object.values(headerMapping).includes('name')) {
      // Try without header - assume name,rut,phone,email,diagnosis
      const fallbackMapping: Record<number, string> = {};
      const defaultCols = ['name', 'rut', 'phone', 'email', 'diagnosis', 'birth_date', 'status'];
      headerRow.forEach((_, i) => {
        if (i < defaultCols.length) fallbackMapping[i] = defaultCols[i];
      });
      const allRows = rows;
      const parsed = parseRows(allRows, fallbackMapping, existingRuts);
      setParsedRows(parsed);
    } else {
      const parsed = parseRows(dataRows, headerMapping, existingRuts);
      setParsedRows(parsed);
    }
    setStep('preview');
  };

  const handlePasteImport = () => {
    navigator.clipboard.readText().then((text) => {
      if (text.trim()) processCSV(text);
    }).catch(() => {
      // Clipboard not available - show file input instead
    });
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const errorRows = parsedRows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    setStep('importing');
    try {
      const patientsToImport = validRows.map(r => ({
        ...r.data,
        status: r.data.status || 'active',
      }));
      await onImport(patientsToImport);
      setImportResults({ success: patientsToImport.length, errors: errorRows.length });
      setStep('done');
    } catch {
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = 'nombre,rut,telefono,email,diagnostico,fecha_nacimiento,estado,motivo_consulta,derivado_por,observaciones\nJuan Pérez,15.234.567-K,+56987654321,juan@email.com,TEL,1990-05-15,activo,Retraso del lenguaje,Colegio,Paciente cooperador\n';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_pacientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Pacientes
          </DialogTitle>
          <DialogDescription>
            Importa pacientes desde un archivo CSV o planilla de cálculo
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            {/* Upload zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-card-foreground mb-1">
                Haz click o arrastra un archivo CSV
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: CSV, TSV (separado por comas, punto y coma o tabulación)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Paste option */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">o</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={handlePasteImport}>
              Pegar desde portapapeles
            </Button>

            {/* Template & info */}
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-3">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">📋 Formato esperado:</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                nombre, rut, telefono, email, diagnostico, fecha_nacimiento, estado, motivo_consulta, derivado_por, observaciones
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mb-2">
                Solo <strong>nombre</strong> es obligatorio. El RUT se marcará como "Por completar" si no se incluye.
              </p>
              <Button variant="link" size="sm" className="text-xs h-auto p-0 text-blue-700 dark:text-blue-400" onClick={downloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                Descargar plantilla CSV
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 pt-2">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{validRows.length}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Válidos</p>
              </div>
              {errorRows.length > 0 && (
                <div className="flex-1 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{errorRows.length}</p>
                  <p className="text-xs text-red-600 dark:text-red-500">Con errores</p>
                </div>
              )}
              <div className="flex-1 rounded-lg bg-muted/50 border p-3 text-center">
                <p className="text-2xl font-bold text-card-foreground">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Preview table */}
            <div className="max-h-[300px] overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">#</th>
                    <th className="p-2 text-left font-medium">Nombre</th>
                    <th className="p-2 text-left font-medium">RUT</th>
                    <th className="p-2 text-left font-medium">Diagnóstico</th>
                    <th className="p-2 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t",
                        row.errors.length > 0 && "bg-red-50/50 dark:bg-red-950/10"
                      )}
                    >
                      <td className="p-2">
                        {row.errors.length > 0 ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        )}
                      </td>
                      <td className="p-2 font-medium">{row.data.name || '-'}</td>
                      <td className="p-2">{row.data.rut || '-'}</td>
                      <td className="p-2">{row.data.diagnosis || '-'}</td>
                      <td className="p-2">
                        {row.errors.length > 0 ? (
                          <span className="text-destructive">{row.errors[0]}</span>
                        ) : (
                          <span className="text-success">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error details */}
            {errorRows.length > 0 && (
              <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    {errorRows.length} fila{errorRows.length !== 1 ? 's' : ''} con errores (se omitirán)
                  </p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Solo se importarán las {validRows.length} filas válidas.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Volver
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={validRows.length === 0}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Importar {validRows.length} paciente{validRows.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Importando pacientes...</p>
            <p className="text-xs text-muted-foreground">Esto puede tomar unos segundos</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <div>
              <p className="text-lg font-semibold text-card-foreground">
                Importación completada
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Se importaron {importResults.success} paciente{importResults.success !== 1 ? 's' : ''} exitosamente
                {importResults.errors > 0 && ` (${importResults.errors} omitidos por errores)`}
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
