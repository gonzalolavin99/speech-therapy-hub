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
