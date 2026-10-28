import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type AuditAction = 
  | 'CREATE' 
  | 'READ' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'EXPORT' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'CONSENT_SIGNED'
  | 'TEST_COMPLETED';

export type EntityType =
  | 'patient'
  | 'session'
  | 'test'
  | 'payment'
  | 'consent'
  | 'user'
  | 'boleta'
  | 'portal_charge';

interface AuditLogEntry {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(async (entry: AuditLogEntry) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        entity_name: entry.entityName || null,
        details: entry.details || null,
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Error logging audit:', error);
      }
    } catch (err) {
      console.error('Failed to create audit log:', err);
    }
  }, [user]);

  const getLogs = useCallback(async (options?: {
    entityType?: EntityType;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> => {
    if (!user) return [];

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.entityType) {
      query = query.eq('entity_type', options.entityType);
    }
    if (options?.action) {
      query = query.eq('action', options.action);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data as AuditLog[];
  }, [user]);

  return { log, getLogs };
}

export function formatAuditAction(action: string): string {
  const actions: Record<string, string> = {
    'CREATE': 'Creó',
    'READ': 'Visualizó',
    'UPDATE': 'Actualizó',
    'DELETE': 'Eliminó',
    'EXPORT': 'Exportó',
    'LOGIN': 'Inició sesión',
    'LOGOUT': 'Cerró sesión',
    'CONSENT_SIGNED': 'Firmó consentimiento',
    'TEST_COMPLETED': 'Completó evaluación',
  };
  return actions[action] || action;
}

export function formatEntityType(type: string): string {
  const types: Record<string, string> = {
    'patient': 'Paciente',
    'session': 'Sesión',
    'test': 'Evaluación',
    'payment': 'Pago',
    'consent': 'Consentimiento',
    'user': 'Usuario',
    'boleta': 'Boleta de Honorarios',
  };
  return types[type] || type;
}
