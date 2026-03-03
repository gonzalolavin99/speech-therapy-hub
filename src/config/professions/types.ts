// ============================================================
// Profession configuration types
// ============================================================

export type ProfessionId = 'fonoaudiologo' | 'psicologo';

export interface ProfessionConfig {
  id: ProfessionId;
  label: string;
  labelFemale: string;
  description: string;
  icon: string; // lucide icon name

  // Labels
  labels: {
    diagnosisTitle: string;
    diagnosisPlaceholder: string;
    planTitle: string;
    consultReasonLabel: string;
    consultReasonPlaceholder: string;
    registrationLabel: string; // "Registro SIS" / "Registro SEC"
    registrationPlaceholder: string;
    specialtiesPlaceholder: string;
    institutionPlaceholder: string;
  };

  // Intervention approaches
  approaches: { value: string; label: string }[];

  // Methods / techniques
  methods: { value: string; label: string }[];

  // Anamnesis fields specific to this profession
  anamnesisFields: {
    key: string;
    label: string;
    placeholder: string;
    rows?: number;
  }[];

  // Available test IDs for this profession
  availableTestIds: string[];

  // AI system prompt
  aiSystemPrompt: string;
}
