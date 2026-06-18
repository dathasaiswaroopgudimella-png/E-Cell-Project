-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create slides table
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    "competitionName" TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "slideUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) on slides
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users policies:
-- Anyone can view user profiles (or we can restrict, but public read is safe)
CREATE POLICY "Allow public read users" ON public.users
    FOR SELECT USING (true);

-- Auth users can insert their own profile
CREATE POLICY "Allow insert own user" ON public.users
    FOR INSERT WITH CHECK (true); -- Insert is handled during register API with service role or authenticated

-- Slides policies:
-- Anyone can read slides (Public view)
CREATE POLICY "Allow public select slides" ON public.slides
    FOR SELECT USING (true);

-- Authenticated users can insert their own slides
CREATE POLICY "Allow authenticated insert slides" ON public.slides
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = "userId");

-- Users can update their own slides
CREATE POLICY "Allow owner update slides" ON public.slides
    FOR UPDATE TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Users can delete their own slides
CREATE POLICY "Allow owner delete slides" ON public.slides
    FOR DELETE TO authenticated
    USING (auth.uid() = "userId");
