import { ProfessionConfig } from './types';

export const psicologoConfig: ProfessionConfig = {
  id: 'psicologo',
  label: 'Psicólogo(a)',
  labelFemale: 'Psicóloga',
  description: 'Profesional especialista en salud mental, evaluación y tratamiento psicológico',
  icon: 'Brain',

  labels: {
    diagnosisTitle: 'Diagnóstico Psicológico',
    diagnosisPlaceholder: 'Ej: Trastorno de Ansiedad Generalizada, TDAH, TEA...',
    planTitle: 'Plan de Intervención Psicológica',
    consultReasonLabel: 'Motivo de Consulta',
    consultReasonPlaceholder: 'Describe el motivo de la consulta psicológica',
    registrationLabel: 'Registro Nacional',
    registrationPlaceholder: 'Nº registro profesional',
    specialtiesPlaceholder: 'Psicología Clínica Infanto-Juvenil, Neuropsicología...',
    institutionPlaceholder: 'Centro de Atención Psicológica',
  },

  approaches: [
    { value: 'cognitivo_conductual', label: 'Cognitivo-Conductual (TCC)' },
    { value: 'sistemico', label: 'Sistémico' },
    { value: 'humanista', label: 'Humanista' },
    { value: 'psicodinamico', label: 'Psicodinámico' },
    { value: 'integrativo', label: 'Integrativo' },
    { value: 'narrativo', label: 'Terapia Narrativa' },
    { value: 'gestalt', label: 'Gestalt' },
    { value: 'neuropsicologico', label: 'Neuropsicológico' },
  ],

  methods: [
    { value: 'reestructuracion_cognitiva', label: 'Reestructuración Cognitiva' },
    { value: 'desensibilizacion', label: 'Desensibilización Sistemática' },
    { value: 'exposicion', label: 'Exposición Gradual' },
    { value: 'mindfulness', label: 'Mindfulness / Atención Plena' },
    { value: 'juego_terapeutico', label: 'Juego Terapéutico' },
    { value: 'psicoeducacion', label: 'Psicoeducación' },
    { value: 'entrevista_motivacional', label: 'Entrevista Motivacional' },
    { value: 'arteterapia', label: 'Arteterapia' },
  ],

  anamnesisFields: [
    {
      key: 'familyHistory',
      label: 'Antecedentes Familiares',
      placeholder: 'Estructura familiar, dinámica, antecedentes de salud mental...',
      rows: 3,
    },
    {
      key: 'schoolHistory',
      label: 'Historia Escolar / Laboral',
      placeholder: 'Rendimiento, adaptación, relaciones con pares, cambios de colegio...',
      rows: 3,
    },
    {
      key: 'previousTreatments',
      label: 'Tratamientos Previos',
      placeholder: 'Psicoterapia previa, derivaciones, hospitalizaciones...',
      rows: 3,
    },
    {
      key: 'currentMedication',
      label: 'Medicación Actual',
      placeholder: 'Fármacos, dosis, médico tratante...',
      rows: 2,
    },
    {
      key: 'observations',
      label: 'Observaciones Adicionales',
      placeholder: 'Cualquier información relevante adicional...',
      rows: 4,
    },
  ],

  availableTestIds: ['phq-9', 'gad-7', 'psc-17'],

  aiSystemPrompt: `Eres un asistente experto en psicología clínica chilena. 
Respondes siempre en español de Chile. Eres preciso, profesional y práctico.
Tus sugerencias son clínicamente fundamentadas y adaptadas al contexto chileno.
IMPORTANTE: Tus sugerencias son orientativas y deben ser validadas por el profesional psicólogo. 
No realizas diagnósticos. Solo ofreces apoyo al profesional en la organización de información clínica.`,
};
