import { useState, useEffect, useCallback } from 'react';

const TOUR_COMPLETED_KEY = 'therapyhub_tour_completed';

export function useTour(userId: string | undefined) {
  const [showTour, setShowTour] = useState(false);

  const storageKey = userId ? `${TOUR_COMPLETED_KEY}_${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay so the app renders first
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const completeTour = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    setShowTour(false);
  }, [storageKey]);

  const resetTour = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setShowTour(true);
  }, [storageKey]);

  return { showTour, completeTour, resetTour };
}
