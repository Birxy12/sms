-- Create the marks table
CREATE TABLE public.marks (
  id text PRIMARY KEY,
  class_name text NOT NULL,
  marks jsonb NOT NULL DEFAULT '{}'::jsonb,
  reg_no text NOT NULL,
  session text NOT NULL,
  student_name text NOT NULL,
  term text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Create basic policies (adjust as needed for your application)
CREATE POLICY "Allow read access for all users" ON public.marks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert/update for all users" ON public.marks
  FOR ALL TO anon USING (true) WITH CHECK (true);
-- Note: Replace 'USING (true)' with actual role checks (e.g. auth.jwt()->>'role' = 'admin') for production security.
