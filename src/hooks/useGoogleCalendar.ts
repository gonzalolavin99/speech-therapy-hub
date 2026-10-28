import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

interface GoogleTokenInfo {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Check if user has Google Calendar connected
  useEffect(() => {
    const checkConnection = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('professional_profiles')
        .select('google_calendar_token')
        .eq('user_id', user.id)
        .maybeSingle(); // cuenta nueva sin perfil: null en vez de 406

      if (data?.google_calendar_token) {
        const tokenInfo = data.google_calendar_token as GoogleTokenInfo;
        // Check if token is still valid
        if (tokenInfo.expires_at > Date.now()) {
          setIsConnected(true);
        } else {
          // Token expired, need to reconnect
          setIsConnected(false);
        }
      }
      setIsLoading(false);
    };

    checkConnection();
  }, [user]);

  // Initialize Google Identity Services
  useEffect(() => {
    const initializeGIS = () => {
      if (typeof google === 'undefined' || !google.accounts) {
        // GIS not loaded yet, retry
        setTimeout(initializeGIS, 100);
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            toast.error('Error al conectar con Google Calendar');
            return;
          }

          // Save token to database
          const tokenInfo: GoogleTokenInfo = {
            access_token: response.access_token,
            expires_at: Date.now() + (response.expires_in * 1000),
          };

          const { error } = await supabase
            .from('professional_profiles')
            .update({ google_calendar_token: tokenInfo })
            .eq('user_id', user?.id);

          if (error) {
            toast.error('Error al guardar la conexión');
          } else {
            setIsConnected(true);
            toast.success('Google Calendar conectado exitosamente');
          }
        },
      });

      setTokenClient(client);
    };

    if (user) {
      initializeGIS();
    }
  }, [user]);

  // Connect to Google Calendar
  const connect = useCallback(() => {
    if (!tokenClient) {
      toast.error('Google Identity Services no está listo');
      return;
    }
    tokenClient.requestAccessToken();
  }, [tokenClient]);

  // Disconnect from Google Calendar
  const disconnect = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('professional_profiles')
      .update({ google_calendar_token: null })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Error al desconectar');
    } else {
      setIsConnected(false);
      toast.success('Google Calendar desconectado');
    }
  }, [user]);

  // Get current access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data } = await supabase
      .from('professional_profiles')
      .select('google_calendar_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data?.google_calendar_token) return null;

    const tokenInfo = data.google_calendar_token as GoogleTokenInfo;
    
    if (tokenInfo.expires_at <= Date.now()) {
      // Token expired
      setIsConnected(false);
      return null;
    }

    return tokenInfo.access_token;
  }, [user]);

  // Create event in Google Calendar
  const createEvent = useCallback(async (event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
  }): Promise<boolean> => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.log('No Google Calendar token available');
      return false;
    }

    const calendarEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Google Calendar API error:', error);
        
        if (response.status === 401) {
          // Token invalid, disconnect
          setIsConnected(false);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return false;
    }
  }, [getAccessToken]);

  return {
    isConnected,
    isLoading,
    connect,
    disconnect,
    createEvent,
  };
}
