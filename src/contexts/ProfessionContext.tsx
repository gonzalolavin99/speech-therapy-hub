import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getProfessionConfig, ProfessionConfig, ProfessionId } from '@/config/professions';
import { setAISystemPrompt } from '@/lib/ai-service';

interface ProfessionContextType {
  config: ProfessionConfig;
  professionId: ProfessionId | null;
  isApproved: boolean;
}

const ProfessionContext = createContext<ProfessionContextType | undefined>(undefined);

export function ProfessionProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  const professionId: ProfessionId | null = profile?.profession || null;
  const config = getProfessionConfig(professionId);
  const isApproved = profile?.approved ?? false;

  // Sync AI system prompt with current profession
  const profLabel = config.id === 'psicologo' ? 'psicólogo' : 'fonoaudiólogo';
  useEffect(() => {
    setAISystemPrompt(config.aiSystemPrompt, profLabel);
  }, [config.aiSystemPrompt, profLabel]);

  return (
    <ProfessionContext.Provider value={{ config, professionId, isApproved }}>
      {children}
    </ProfessionContext.Provider>
  );
}

export function useProfession() {
  const context = useContext(ProfessionContext);
  if (!context) {
    throw new Error('useProfession must be used within a ProfessionProvider');
  }
  return context;
}
