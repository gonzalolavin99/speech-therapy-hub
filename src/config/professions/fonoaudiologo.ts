import { ProfessionConfig } from './types';

export const fonoaudiologoConfig: ProfessionConfig = {
  id: 'fonoaudiologo',
  label: 'Fonoaudiólogo(a)',
  labelFemale: 'Fonoaudióloga',
  description: 'Profesional especialista en comunicación, lenguaje, habla, voz y deglución',
  icon: 'Mic2',

  labels: {
    diagnosisTitle: 'Diagnóstico Fonoaudiológico',
    diagnosisPlaceholder: 'Ej: Trastorno Fonológico, TEL, Disfemia...',
    planTitle: 'Plan de Intervención Fonoaudiológica',
    consultReasonLabel: 'Motivo de Consulta',
    consultReasonPlaceholder: 'Describe el motivo de la consulta fonoaudiológica',
    registrationLabel: 'Registro SIS',
    registrationPlaceholder: '12345-6',
    specialtiesPlaceholder: 'Trastornos del Lenguaje, Motricidad Orofacial...',
    institutionPlaceholder: 'Centro de Fonoaudiología Integral',
  },

  approaches: [
    { value: 'fonologico', label: 'Enfoque Fonológico' },
    { value: 'pragmatico', label: 'Enfoque Pragmático' },
    { value: 'semantico', label: 'Enfoque Semántico' },
    { value: 'morfosintactico', label: 'Enfoque Morfosintáctico' },
    { value: 'fluencia', label: 'Fluencia' },
    { value: 'motricidad', label: 'Motricidad Orofacial' },
    { value: 'deglusion', label: 'Deglución' },
  ],

  methods: [
    { value: 'ciclos', label: 'Ciclos' },
    { value: 'pares_minimos', label: 'Pares Mínimos' },
    { value: 'modelado', label: 'Modelado' },
    { value: 'interaccionista', label: 'Interaccionista' },
    { value: 'conductual', label: 'Conductual' },
    { value: 'naturalista', label: 'Naturalista' },
  ],

  anamnesisFields: [
    {
      key: 'perinatalHistory',
      label: 'Antecedentes Perinatales',
      placeholder: 'Embarazo, parto, peso al nacer, complicaciones...',
      rows: 3,
    },
    {
      key: 'psychomotorDev',
      label: 'Desarrollo Psicomotor',
      placeholder: 'Hitos del desarrollo, sedestación, marcha, lenguaje...',
      rows: 3,
    },
    {
      key: 'observations',
      label: 'Observaciones Adicionales',
      placeholder: 'Cualquier información relevante adicional...',
      rows: 4,
    },
  ],

  availableTestIds: ['mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3'],

  aiSystemPrompt: `Eres un asistente experto en fonoaudiología clínica chilena. 
Respondes siempre en español de Chile. Eres preciso, profesional y práctico.
Tus sugerencias son clínicamente fundamentadas y adaptadas al contexto chileno.
IMPORTANTE: Tus sugerencias son orientativas y deben ser validadas por el profesional fonoaudiólogo.`,
};
