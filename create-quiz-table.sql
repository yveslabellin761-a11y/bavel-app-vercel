-- Quiz/Onboarding Table for Bavel
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL,
  birthday TEXT NOT NULL,
  purpose TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sexual_orientation TEXT,
  relationship_status TEXT,
  bio TEXT,
  height TEXT,
  school TEXT,
  job_title TEXT,
  company TEXT,
  drinking TEXT,
  smoking TEXT,
  kids TEXT,
  education_level TEXT,
  personality TEXT,
  interests TEXT[],
  pets TEXT,
  star_sign TEXT,
  religion TEXT,
  languages TEXT,
  prompt1_question TEXT,
  prompt1_answer TEXT,
  prompt2_question TEXT,
  prompt2_answer TEXT,
  prompt3_question TEXT,
  prompt3_answer TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.quiz ENABLE ROW LEVEL SECURITY;

-- Users can only access their own quiz data
CREATE POLICY "Users can view their own quiz" 
  ON public.quiz FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz" 
  ON public.quiz FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own quiz" 
  ON public.quiz FOR UPDATE 
  USING (auth.uid()::text = user_id);

-- Enable Realtime for quiz (optional, for realtime updates)
ALTER PUBLICATION supabase_realtime ADD TABLE quiz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS quiz_user_id_idx ON public.quiz(user_id);
CREATE INDEX IF NOT EXISTS quiz_completed_idx ON public.quiz(completed);