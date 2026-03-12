export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          user_id: string
          name: string
          rut: string
          birth_date: string | null
          age: number | null
          phone: string | null
          email: string | null
          diagnosis: string | null
          status: 'active' | 'inactive' | 'completed'
          consult_reason: string | null
          referred_by: string | null
          perinatal_history: string | null
          psychomotor_dev: string | null
          observations: string | null
          address: string | null
          region: string | null
          comuna: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          rut: string
          birth_date?: string | null
          age?: number | null
          phone?: string | null
          email?: string | null
          diagnosis?: string | null
          status?: 'active' | 'inactive' | 'completed'
          consult_reason?: string | null
          referred_by?: string | null
          perinatal_history?: string | null
          psychomotor_dev?: string | null
          observations?: string | null
          address?: string | null
          region?: string | null
          comuna?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          rut?: string
          birth_date?: string | null
          age?: number | null
          phone?: string | null
          email?: string | null
          diagnosis?: string | null
          status?: 'active' | 'inactive' | 'completed'
          consult_reason?: string | null
          referred_by?: string | null
          perinatal_history?: string | null
          psychomotor_dev?: string | null
          observations?: string | null
          address?: string | null
          region?: string | null
          comuna?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          date: string
          time: string
          duration_minutes: number
          type: 'evaluation' | 'therapy' | 'follow_up'
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          date: string
          time: string
          duration_minutes?: number
          type: 'evaluation' | 'therapy' | 'follow_up'
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string
          date?: string
          time?: string
          duration_minutes?: number
          type?: 'evaluation' | 'therapy' | 'follow_up'
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          session_id: string | null
          amount: number
          status: 'paid' | 'pending' | 'overdue'
          session_date: string
          payment_date: string | null
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          session_id?: string | null
          amount: number
          status?: 'paid' | 'pending' | 'overdue'
          session_date: string
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string
          session_id?: string | null
          amount?: number
          status?: 'paid' | 'pending' | 'overdue'
          session_date?: string
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plannings: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          intervention_approach: string
          method: string
          modality: 'individual' | 'group'
          general_objective: string
          total_sessions: number
          completed_sessions: number
          frequency: string
          status: 'active' | 'completed' | 'paused'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          intervention_approach: string
          method: string
          modality?: 'individual' | 'group'
          general_objective: string
          total_sessions: number
          completed_sessions?: number
          frequency: string
          status?: 'active' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string
          intervention_approach?: string
          method?: string
          modality?: 'individual' | 'group'
          general_objective?: string
          total_sessions?: number
          completed_sessions?: number
          frequency?: string
          status?: 'active' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
        }
      }
      boletas_honorarios: {
        Row: {
          id: string
          user_id: string
          payment_id: string | null
          patient_id: string | null
          boleta_number: string
          sii_folio: string | null
          amount_bruto: number
          retencion_percent: number
          retencion_amount: number
          amount_liquido: number
          description: string
          service_date: string
          emission_date: string | null
          status: 'draft' | 'pending_sii' | 'emitted' | 'voided'
          professional_rut: string | null
          professional_name: string
          patient_rut: string | null
          patient_name: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payment_id?: string | null
          patient_id?: string | null
          boleta_number: string
          sii_folio?: string | null
          amount_bruto: number
          retencion_percent?: number
          retencion_amount: number
          amount_liquido: number
          description: string
          service_date: string
          emission_date?: string | null
          status?: 'draft' | 'pending_sii' | 'emitted' | 'voided'
          professional_rut?: string | null
          professional_name: string
          patient_rut?: string | null
          patient_name: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          payment_id?: string | null
          patient_id?: string | null
          boleta_number?: string
          sii_folio?: string | null
          amount_bruto?: number
          retencion_percent?: number
          retencion_amount?: number
          amount_liquido?: number
          description?: string
          service_date?: string
          emission_date?: string | null
          status?: 'draft' | 'pending_sii' | 'emitted' | 'voided'
          professional_rut?: string | null
          professional_name?: string
          patient_rut?: string | null
          patient_name?: string
          notes?: string | null
        }
      }
      test_results: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          test_type: 'mbgr' | 'tar' | 'teprosif'
          test_name: string
          evaluation_date: string
          score: string | null
          status: 'pending' | 'completed'
          results_data: Json | null
          observations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          test_type: 'mbgr' | 'tar' | 'teprosif'
          test_name: string
          evaluation_date: string
          score?: string | null
          status?: 'pending' | 'completed'
          results_data?: Json | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string
          test_type?: 'mbgr' | 'tar' | 'teprosif'
          test_name?: string
          evaluation_date?: string
          score?: string | null
          status?: 'pending' | 'completed'
          results_data?: Json | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
      session_packs: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          name: string
          total_sessions: number
          used_sessions: number
          price_total: number
          price_per_session: number
          original_price_per_session: number
          discount_percent: number
          status: 'active' | 'completed' | 'cancelled' | 'expired'
          payment_status: 'pending' | 'partial' | 'paid'
          notes: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          name?: string
          total_sessions: number
          used_sessions?: number
          price_total: number
          original_price_per_session?: number
          status?: 'active' | 'completed' | 'cancelled' | 'expired'
          payment_status?: 'pending' | 'partial' | 'paid'
          notes?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string
          name?: string
          total_sessions?: number
          used_sessions?: number
          price_total?: number
          original_price_per_session?: number
          status?: 'active' | 'completed' | 'cancelled' | 'expired'
          payment_status?: 'pending' | 'partial' | 'paid'
          notes?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portal_charges: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          payment_id: string | null
          session_id: string | null
          description: string
          amount: number
          status: 'pending' | 'paid' | 'confirmed' | 'cancelled'
          payment_method: string | null
          payment_reference: string | null
          patient_confirmed_at: string | null
          professional_confirmed_at: string | null
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          payment_id?: string | null
          session_id?: string | null
          description: string
          amount: number
          status?: 'pending' | 'paid' | 'confirmed' | 'cancelled'
          payment_method?: string | null
          payment_reference?: string | null
          due_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          status?: 'pending' | 'paid' | 'confirmed' | 'cancelled'
          payment_method?: string | null
          payment_reference?: string | null
          patient_confirmed_at?: string | null
          professional_confirmed_at?: string | null
          due_date?: string | null
          notes?: string | null
        }
      }
      portal_messages: {
        Row: {
          id: string
          user_id: string
          patient_id: string
          sender_type: 'patient' | 'professional'
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id: string
          sender_type: 'patient' | 'professional'
          message: string
          read_at?: string | null
        }
        Update: {
          read_at?: string | null
        }
      }
      professional_bank_info: {
        Row: {
          id: string
          user_id: string
          bank_name: string
          account_type: string
          account_number: string
          holder_rut: string
          holder_name: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_name: string
          account_type: string
          account_number: string
          holder_rut: string
          holder_name: string
          email: string
        }
        Update: {
          bank_name?: string
          account_type?: string
          account_number?: string
          holder_rut?: string
          holder_name?: string
          email?: string
        }
      }
      contact_requests: {
        Row: {
          id: string
          professional_id: string
          name: string
          phone: string | null
          email: string | null
          message: string | null
          service_type: string
          status: 'pending' | 'read' | 'contacted' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          name: string
          phone?: string | null
          email?: string | null
          message?: string | null
          service_type?: string
          status?: 'pending' | 'read' | 'contacted' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          message?: string | null
          service_type?: string
          status?: 'pending' | 'read' | 'contacted' | 'archived'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Patient = Database['public']['Tables']['patients']['Row']
export type PatientInsert = Database['public']['Tables']['patients']['Insert']
export type PatientUpdate = Database['public']['Tables']['patients']['Update']

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type Planning = Database['public']['Tables']['plannings']['Row']
export type PlanningInsert = Database['public']['Tables']['plannings']['Insert']
export type PlanningUpdate = Database['public']['Tables']['plannings']['Update']

export type TestResult = Database['public']['Tables']['test_results']['Row']
export type TestResultInsert = Database['public']['Tables']['test_results']['Insert']
export type TestResultUpdate = Database['public']['Tables']['test_results']['Update']

export type BoletaHonorarios = Database['public']['Tables']['boletas_honorarios']['Row']
export type BoletaHonorariosInsert = Database['public']['Tables']['boletas_honorarios']['Insert']
export type BoletaHonorariosUpdate = Database['public']['Tables']['boletas_honorarios']['Update']

export type SessionPack = Database['public']['Tables']['session_packs']['Row']
export type SessionPackInsert = Database['public']['Tables']['session_packs']['Insert']
export type SessionPackUpdate = Database['public']['Tables']['session_packs']['Update']

export type ContactRequest = Database['public']['Tables']['contact_requests']['Row']
export type ContactRequestInsert = Database['public']['Tables']['contact_requests']['Insert']
export type ContactRequestUpdate = Database['public']['Tables']['contact_requests']['Update']
