-- ==============================================================================
-- TOTAL TRACKING — DATABASE SCHEMA (Supabase / PostgreSQL)
-- Multi-game architecture prepared for Total War: WARHAMMER III, Shogun 2, Rome II, etc.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GAMES
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FACTIONS
CREATE TABLE IF NOT EXISTS public.factions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_hex TEXT DEFAULT '#c9a227',
    icon_svg TEXT,
    race TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, name)
);

-- 3. LORDS / LEADERS
CREATE TABLE IF NOT EXISTS public.lords (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    faction_id UUID REFERENCES public.factions(id) ON DELETE SET NULL,
    chrono_number INT NOT NULL,
    name TEXT NOT NULL,
    era INT NOT NULL DEFAULT 1,
    wave INT NOT NULL DEFAULT 1,
    dlc_name TEXT,
    wiki_title TEXT,
    custom_portrait_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, chrono_number)
);

-- 4. LORD PROGRESS (MEDALS & BORDERS BTD6 STYLE)
CREATE TABLE IF NOT EXISTS public.lord_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lord_id INT REFERENCES public.lords(id) ON DELETE CASCADE,
    short_victory BOOLEAN DEFAULT FALSE,
    long_victory BOOLEAN DEFAULT FALSE,
    crisis_victory BOOLEAN DEFAULT FALSE,
    black_border BOOLEAN DEFAULT FALSE,
    custom_portrait_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lord_id)
);

-- 5. CAMPAIGN RUNS (TENTATIVAS)
CREATE TABLE IF NOT EXISTS public.campaign_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lord_id INT REFERENCES public.lords(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'victory', 'defeat')),
    difficulty TEXT DEFAULT 'Normal',
    final_turn INT DEFAULT 0,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    manual_days INT DEFAULT 1,
    total_seconds INT DEFAULT 0,
    is_black_border_eligible BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PLAY SESSIONS (CRONÔMETRO DETALHADO)
CREATE TABLE IF NOT EXISTS public.play_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.campaign_runs(id) ON DELETE CASCADE,
    lord_id INT REFERENCES public.lords(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    turn_reached INT,
    auto_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_lords_game_chrono ON public.lords(game_id, chrono_number);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.lord_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_lord ON public.campaign_runs(user_id, lord_id);
CREATE INDEX IF NOT EXISTS idx_sessions_run ON public.play_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lord ON public.play_sessions(lord_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lord_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;

-- Games, Factions, Lords are read-only for public/authenticated
CREATE POLICY "Public games read" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public factions read" ON public.factions FOR SELECT USING (true);
CREATE POLICY "Public lords read" ON public.lords FOR SELECT USING (true);

-- User-specific tables: Users can manage their own records
CREATE POLICY "Users can manage own progress" ON public.lord_progress 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own runs" ON public.campaign_runs 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own sessions" ON public.play_sessions 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Seed initial game: Total War: WARHAMMER III
INSERT INTO public.games (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'wh3', 'Total War: WARHAMMER III')
ON CONFLICT (slug) DO NOTHING;

-- Seed secondary games for future expansion
INSERT INTO public.games (slug, name)
VALUES 
    ('shogun2', 'Total War: SHOGUN 2'),
    ('rome2', 'Total War: ROME II'),
    ('three_kingdoms', 'Total War: THREE KINGDOMS')
ON CONFLICT (slug) DO NOTHING;
