-- =====================================================
-- MIGRATION: Add consent fields to patients table
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add consent fields to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_guardian_name TEXT,
ADD COLUMN IF NOT EXISTS consent_guardian_rut TEXT,
ADD COLUMN IF NOT EXISTS consent_signature TEXT;

-- Create consent_logs table for audit trail
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'data_treatment',
  consent_given BOOLEAN NOT NULL,
  guardian_name TEXT,
  guardian_rut TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on consent_logs
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent_logs
DROP POLICY IF EXISTS "Users can view own consent logs" ON consent_logs;
CREATE POLICY "Users can view own consent logs"
  ON consent_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consent logs" ON consent_logs;
CREATE POLICY "Users can insert own consent logs"
  ON consent_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_consent_logs_patient_id ON consent_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
