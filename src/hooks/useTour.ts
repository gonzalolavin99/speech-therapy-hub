import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const TOUR_COMPLETED_KEY = 'therapyhub_tour_completed';

export function useTour(userId: string | undefined, tourCompletedFromDB?: boolean) {
  const [showTour, setShowTour] = useState(false);

  const storageKey = userId ? `${TOUR_COMPLETED_KEY}_${userId}` : null;

  useEffect(() => {
    if (!userId || !storageKey) return;

    // DB is the source of truth; localStorage is just a fast cache
    if (tourCompletedFromDB) {
      // Sync localStorage with DB
      localStorage.setItem(storageKey, 'true');
      setShowTour(false);
      return;
    }

    // DB says not completed — double-check localStorage as fallback
    const localCompleted = localStorage.getItem(storageKey);
    if (localCompleted === 'true') {
      // localStorage says done but DB doesn't — sync DB
      supabase
        .from('professional_profiles')
        .update({ tour_completed: true })
        .eq('user_id', userId)
        .then();
      setShowTour(false);
      return;
    }

    // Neither DB nor localStorage say completed — show tour after a short delay
    const timer = setTimeout(() => setShowTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, storageKey, tourCompletedFromDB]);

  const completeTour = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    if (userId) {
      supabase
        .from('professional_profiles')
        .update({ tour_completed: true })
        .eq('user_id', userId)
        .then();
    }
    setShowTour(false);
  }, [storageKey, userId]);

  const resetTour = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    if (userId) {
      supabase
        .from('professional_profiles')
        .update({ tour_completed: false })
        .eq('user_id', userId)
        .then();
    }
    setShowTour(true);
  }, [storageKey, userId]);

  return { showTour, completeTour, resetTour };
}
