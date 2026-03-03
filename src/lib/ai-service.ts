const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

export function isAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export async function getAICompletion({ messages, temperature = 0.7, maxTokens = 2000 }: AICompletionOptions): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================
// Specialized AI functions for clinical professionals
// ============================================================

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente experto en fonoaudiología clínica chilena. 
Respondes siempre en español de Chile. Eres preciso, profesional y práctico.
Tus sugerencias son clínicamente fundamentadas y adaptadas al contexto chileno.
IMPORTANTE: Tus sugerencias son orientativas y deben ser validadas por el profesional fonoaudiólogo.`;

let _professionSystemPrompt: string | null = null;

export function setAISystemPrompt(prompt: string) {
  _professionSystemPrompt = prompt;
}

function getSystemPrompt(): string {
  return _professionSystemPrompt || DEFAULT_SYSTEM_PROMPT;
}

export interface TestDiagnosisResult {
  possibleDiagnoses: string[];
  clinicalAnalysis: string;
  therapySuggestions: string[];
  recommendedApproach: string;
  priorityAreas: string[];
  additionalRecommendations: string;
}

export async function analyzeTestResults(
  testType: string,
  testName: string,
  patientName: string,
  patientAge?: number | null,
  patientDiagnosis?: string | null,
  testResults: any = {}
): Promise<TestDiagnosisResult> {
  const testContext = buildTestContext(testType, testResults);

  const prompt = `Analiza los siguientes resultados de un test fonoaudiológico y proporciona un análisis clínico completo.

DATOS DEL PACIENTE:
- Nombre: ${patientName}
${patientAge ? `- Edad: ${patientAge} años` : ''}
${patientDiagnosis ? `- Diagnóstico actual: ${patientDiagnosis}` : '- Sin diagnóstico previo'}

TEST APLICADO: ${testName} (${testType})

RESULTADOS:
${testContext}

Responde ESTRICTAMENTE en el siguiente formato JSON (sin markdown, solo JSON puro):
{
  "possibleDiagnoses": ["diagnóstico 1", "diagnóstico 2"],
  "clinicalAnalysis": "Análisis clínico detallado de los resultados en 2-3 párrafos",
  "therapySuggestions": ["sugerencia terapéutica 1", "sugerencia 2", "sugerencia 3"],
  "recommendedApproach": "Enfoque de intervención recomendado (ej: Enfoque fonológico, Terapia miofuncional, etc.)",
  "priorityAreas": ["área prioritaria 1", "área 2"],
  "additionalRecommendations": "Recomendaciones adicionales para el fonoaudiólogo"
}`;

  const response = await getAICompletion({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    maxTokens: 2000,
  });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as TestDiagnosisResult;
  } catch {
    return {
      possibleDiagnoses: ['Error al procesar respuesta de IA'],
      clinicalAnalysis: response,
      therapySuggestions: [],
      recommendedApproach: '',
      priorityAreas: [],
      additionalRecommendations: '',
    };
  }
}

export interface PlanningAISuggestion {
  generalObjective: string;
  specificObjectives: string;
  operationalObjectives: string;
  contents: string;
  recommendedMethod: string;
  generalPlan: string;
}

export async function generatePlanningSuggestions(
  patientName: string,
  patientAge?: number | null,
  diagnosis?: string | null,
  approach?: string,
  testHistory?: string
): Promise<PlanningAISuggestion> {
  const prompt = `Genera una planificación de intervención para el siguiente caso clínico.

DATOS DEL PACIENTE:
- Nombre: ${patientName}
${patientAge ? `- Edad: ${patientAge} años` : ''}
${diagnosis ? `- Diagnóstico: ${diagnosis}` : '- Sin diagnóstico registrado'}
${approach ? `- Enfoque solicitado: ${approach}` : ''}
${testHistory ? `\nHISTORIAL DE TESTS:\n${testHistory}` : ''}

Responde ESTRICTAMENTE en JSON (sin markdown):
{
  "generalObjective": "Objetivo general de la intervención",
  "specificObjectives": "Objetivo específico 1\\nObjetivo específico 2\\nObjetivo específico 3",
  "operationalObjectives": "Objetivo operacional 1\\nObjetivo operacional 2\\nObjetivo operacional 3",
  "contents": "Contenidos a trabajar separados por comas",
  "recommendedMethod": "Método recomendado (ciclos, pares_minimos, modelado, etc.)",
  "generalPlan": "Descripción del plan general de intervención en 2-3 párrafos"
}`;

  const response = await getAICompletion({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as PlanningAISuggestion;
  } catch {
    return {
      generalObjective: '',
      specificObjectives: '',
      operationalObjectives: '',
      contents: '',
      recommendedMethod: '',
      generalPlan: response,
    };
  }
}

export async function generateSessionNotes(
  sessionType: string,
  patientName: string,
  diagnosis?: string | null,
  previousNotes?: string
): Promise<string> {
  const prompt = `Genera una nota clínica de sesión breve y profesional.

DATOS:
- Paciente: ${patientName}
- Tipo de sesión: ${sessionType}
${diagnosis ? `- Diagnóstico: ${diagnosis}` : ''}
${previousNotes ? `- Notas previas: ${previousNotes}` : ''}

Genera una nota clínica de ejemplo que el profesional pueda editar. Incluye: objetivo de la sesión, actividades realizadas, respuesta del paciente, y observaciones. Máximo 150 palabras. Solo texto plano, sin formato especial.`;

  return getAICompletion({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    maxTokens: 500,
  });
}

export async function generatePatientSummary(
  patientName: string,
  patientAge?: number | null,
  diagnosis?: string | null,
  consultReason?: string | null,
  observations?: string | null,
  testResults?: string,
  sessionsInfo?: string
): Promise<string> {
  const prompt = `Genera un resumen clínico integrado del siguiente paciente.

DATOS DEL PACIENTE:
- Nombre: ${patientName}
${patientAge ? `- Edad: ${patientAge} años` : ''}
${diagnosis ? `- Diagnóstico: ${diagnosis}` : ''}
${consultReason ? `- Motivo de consulta: ${consultReason}` : ''}
${observations ? `- Observaciones: ${observations}` : ''}
${testResults ? `\nRESULTADOS DE TESTS:\n${testResults}` : ''}
${sessionsInfo ? `\nINFO DE SESIONES:\n${sessionsInfo}` : ''}

Genera un resumen clínico profesional de 2-3 párrafos que integre toda la información disponible. Destaca hallazgos clave, estado actual y recomendaciones. Solo texto plano.`;

  return getAICompletion({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    maxTokens: 800,
  });
}

export async function generateProgressAnalysis(
  activePatients: number,
  totalPatients: number,
  activePlannings: number,
  completedSessions: number,
  weekSessions: number,
  paidPayments: number,
  totalPayments: number
): Promise<string> {
  const prompt = `Eres el asistente de un profesional clínico chileno. Genera un análisis breve de progreso semanal basado en estas métricas:

MÉTRICAS ACTUALES:
- Pacientes activos: ${activePatients} de ${totalPatients} total
- Planificaciones activas: ${activePlannings}
- Sesiones completadas: ${completedSessions}
- Sesiones esta semana: ${weekSessions}
- Pagos realizados: ${paidPayments} de ${totalPayments} registros

Genera un análisis conciso (máximo 100 palabras) con:
1. Estado general de la práctica
2. Una recomendación práctica
3. Un dato motivacional

Solo texto plano en español chileno, sin títulos ni formato especial.`;

  return getAICompletion({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    maxTokens: 300,
  });
}

// ============================================================
// Admin Insights: AI-powered usage analysis & suggestions
// ============================================================

export interface AdminInsightResult {
  resumen: string;
  hallazgos: string[];
  sugerenciasMejora: string[];
  flujosIncompletos: string[];
  recomendacionesUX: string[];
}

export async function generateAdminInsights(stats: {
  totalLogs: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  topUsers: { email: string; count: number }[];
  patientsWithoutPlanning: number;
  planningsWithoutSessions: number;
  unpaidPayments: number;
  periodDays: number;
}): Promise<AdminInsightResult> {
  const prompt = `Eres un consultor de UX y producto para una aplicación de gestión clínica chilena llamada TherapyHub. Analiza las siguientes métricas de uso y genera insights accionables.

MÉTRICAS DE USO (últimos ${stats.periodDays} días):
- Total de acciones registradas: ${stats.totalLogs}
- Usuarios únicos activos: ${stats.uniqueUsers}

ACCIONES POR TIPO:
${Object.entries(stats.actionBreakdown).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

ENTIDADES MÁS USADAS:
${Object.entries(stats.entityBreakdown).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

DISTRIBUCIÓN HORARIA (hora: cantidad):
${Object.entries(stats.hourlyDistribution).map(([h, c]) => `- ${h}:00 → ${c} acciones`).join('\n')}

USUARIOS MÁS ACTIVOS:
${stats.topUsers.map(u => `- ${u.email}: ${u.count} acciones`).join('\n')}

FLUJOS INCOMPLETOS:
- Pacientes sin planificación: ${stats.patientsWithoutPlanning}
- Planificaciones sin sesiones registradas: ${stats.planningsWithoutSessions}
- Pagos pendientes: ${stats.unpaidPayments}

Responde ESTRICTAMENTE en JSON (sin markdown):
{
  "resumen": "Resumen ejecutivo de 2-3 líneas sobre el estado de uso de la app",
  "hallazgos": ["hallazgo clave 1", "hallazgo 2", "hallazgo 3"],
  "sugerenciasMejora": ["sugerencia de mejora funcional 1", "sugerencia 2", "sugerencia 3"],
  "flujosIncompletos": ["observación sobre flujo incompleto 1", "observación 2"],
  "recomendacionesUX": ["recomendación UX/UI 1", "recomendación 2"]
}`;

  const response = await getAICompletion({
    messages: [
      { role: 'system', content: 'Eres un experto en análisis de producto y UX para aplicaciones de salud. Respondes en español de Chile. Eres directo, práctico y basado en datos.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as AdminInsightResult;
  } catch {
    return {
      resumen: response,
      hallazgos: [],
      sugerenciasMejora: [],
      flujosIncompletos: [],
      recomendacionesUX: [],
    };
  }
}

// ============================================================
// Helper: Build human-readable test context from raw results
// ============================================================

function buildTestContext(testType: string, results: any): string {
  try {
    if (testType === 'tar') {
      const { summary, sectionObservations } = results;
      let context = '';
      if (summary) {
        context += `Resumen: ${summary.correct || 0} correctos, ${summary.substitutions || 0} sustituciones, ${summary.omissions || 0} omisiones, ${summary.distortions || 0} distorsiones.\n`;
      }
      if (sectionObservations) {
        const obs = Object.entries(sectionObservations)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        if (obs) context += `Observaciones:\n${obs}\n`;
      }
      return context || JSON.stringify(results, null, 2);
    }

    if (testType === 'mbgr' || testType === 'mmbgr-lactantes') {
      const { score, results: items } = results;
      let context = `Puntaje total: ${score || 0}\n`;
      if (items && typeof items === 'object') {
        context += `Items evaluados: ${Object.keys(items).length}\n`;
      }
      return context;
    }

    if (testType === 'teprosif') {
      const { summary } = results;
      let context = '';
      if (summary) {
        context += `Total PSF: ${summary.totalPSF || 0}\nItems evaluados: ${summary.itemsEvaluated || 0}\n`;
      }
      return context || JSON.stringify(results, null, 2);
    }

    if (testType === 'reel-3') {
      const { score, rawScores, scores } = results;
      let context = `Puntaje total: ${score || 0}\n`;
      if (rawScores) {
        context += `Receptivo: ${rawScores.receptivo || 0}\nExpresivo: ${rawScores.expresivo || 0}\n`;
      }
      if (scores?.receptivo?.percentil) context += `Percentil receptivo: ${scores.receptivo.percentil}\n`;
      if (scores?.expresivo?.percentil) context += `Percentil expresivo: ${scores.expresivo.percentil}\n`;
      return context;
    }

    return JSON.stringify(results, null, 2);
  } catch {
    return JSON.stringify(results, null, 2);
  }
}
