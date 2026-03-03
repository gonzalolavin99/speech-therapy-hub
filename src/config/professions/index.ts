import { ProfessionConfig, ProfessionId } from './types';
import { fonoaudiologoConfig } from './fonoaudiologo';
import { psicologoConfig } from './psicologo';

export type { ProfessionConfig, ProfessionId };

export const professionConfigs: Record<ProfessionId, ProfessionConfig> = {
  fonoaudiologo: fonoaudiologoConfig,
  psicologo: psicologoConfig,
};

export const professionOptions: { value: ProfessionId; label: string; description: string }[] = [
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)', description: 'Comunicación, lenguaje, habla, voz y deglución' },
  { value: 'psicologo', label: 'Psicólogo(a)', description: 'Salud mental, evaluación y tratamiento psicológico' },
];

export function getProfessionConfig(profession?: ProfessionId | string | null): ProfessionConfig {
  if (profession && profession in professionConfigs) {
    return professionConfigs[profession as ProfessionId];
  }
  return fonoaudiologoConfig; // default fallback
}
