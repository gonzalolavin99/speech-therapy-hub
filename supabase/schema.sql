-- TherapyHub Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rut TEXT NOT NULL,
  birth_date DATE,
  age INTEGER,
  phone TEXT,
  email TEXT,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  consult_reason TEXT,
  referred_by TEXT,
  perinatal_history TEXT,
  psychomotor_dev TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  type TEXT NOT NULL CHECK (type IN ('evaluation', 'therapy', 'follow_up')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  session_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLANNINGS TABLE
-- =============================================
CREATE TABLE plannings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  intervention_approach TEXT NOT NULL,
  method TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'individual' CHECK (modality IN ('individual', 'group')),
  general_objective TEXT NOT NULL,
  total_sessions INTEGER NOT NULL,
  completed_sessions INTEGER DEFAULT 0,
  frequency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEST RESULTS TABLE
-- =============================================
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('mbgr', 'tar', 'teprosif')),
  test_name TEXT NOT NULL,
  evaluation_date DATE NOT NULL,
  score TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  results_data JSONB,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only see their own data
-- =============================================

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Policies for patients
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patients" ON patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients" ON patients
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for sessions
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" ON payments
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for plannings
CREATE POLICY "Users can view their own plannings" ON plannings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plannings" ON plannings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plannings" ON plannings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plannings" ON plannings
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for test_results
CREATE POLICY "Users can view their own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test results" ON test_results
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_patient_id ON payments(patient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_plannings_user_id ON plannings(user_id);
CREATE INDEX idx_plannings_patient_id ON plannings(patient_id);
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_patient_id ON test_results(patient_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- Automatically update updated_at on changes
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plannings_updated_at
  BEFORE UPDATE ON plannings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at
  BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
