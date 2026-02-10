import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE = 5 * 60 * 1000; // Advertir 5 minutos antes

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Limpiar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    if (!user) return;

    // Timer de advertencia
    warningRef.current = setTimeout(() => {
      toast.warning('Tu sesión expirará en 5 minutos', {
        description: 'Mueve el mouse o haz clic para mantener la sesión activa',
        duration: 10000,
      });
    }, TIMEOUT_DURATION - WARNING_BEFORE);

    // Timer de logout
    timeoutRef.current = setTimeout(() => {
      toast.error('Sesión expirada por inactividad');
      signOut();
    }, TIMEOUT_DURATION);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    // Eventos que resetean el timer
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle para no ejecutar en cada movimiento del mouse
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimers();
      }, 1000); // Throttle de 1 segundo
    };

    // Agregar event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [user, resetTimers]);

  return {
    resetTimers,
    getLastActivity: () => lastActivityRef.current,
  };
}
