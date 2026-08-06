-- ==============================================================================
-- Fadelopram Rx Academy — Complete & Unified SQL Database Schema & Migration Script
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Trainees Table
CREATE TABLE IF NOT EXISTS trainees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER DEFAULT 22,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    pharmacy_group TEXT DEFAULT 'صيدليات آل مغاوري',
    training_branch TEXT DEFAULT '',
    selected_courses TEXT DEFAULT '[]',
    granted_courses TEXT DEFAULT '[]',
    current_level TEXT DEFAULT 'Passengers',
    status TEXT DEFAULT 'pending',
    reject_reason TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    university TEXT DEFAULT '',
    college TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    device_info TEXT DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    telegram_chat_id TEXT DEFAULT '',
    telegram_handle TEXT DEFAULT '',
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add missing columns to trainees
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS training_branch TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS selected_courses TEXT DEFAULT '[]';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS granted_courses TEXT DEFAULT '[]';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS device_info TEXT DEFAULT '{}';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS reject_reason TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS university TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS college TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    type TEXT DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    icon TEXT DEFAULT 'fa-bullhorn',
    color TEXT DEFAULT 'gold',
    link TEXT DEFAULT '',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default Owner Admin securely using SHA-256 hash
INSERT INTO admins (username, password, role)
VALUES ('2e6fcd404b105495da8d2a76fb71879f0bc618d649de1fdb23f3ead1830513e8', '2e6fcd404b105495da8d2a76fb71879f0bc618d649de1fdb23f3ead1830513e8', 'Owner')
ON CONFLICT (username) DO NOTHING;

-- 4. Videos Table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    video_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    level TEXT DEFAULT 'Passengers',
    topic TEXT DEFAULT 'عام',
    sort_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Curriculum Table (Hierarchical Tree)
CREATE TABLE IF NOT EXISTS curriculum (
    id SERIAL PRIMARY KEY,
    level TEXT DEFAULT '',
    title TEXT NOT NULL,
    content_html TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 1,
    parent_id INTEGER,
    type TEXT DEFAULT 'folder',
    icon TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    video_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE curriculum ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '';
ALTER TABLE curriculum ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE curriculum ADD COLUMN IF NOT EXISTS video_id TEXT DEFAULT '';

-- 6. Progress Table
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    level TEXT NOT NULL,
    watched_videos TEXT DEFAULT '',
    exam_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (email, level)
);

-- 7. Promotions Table
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    certificate_template TEXT DEFAULT '',
    certificate_url TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    level TEXT NOT NULL,
    question_ar TEXT NOT NULL,
    question_en TEXT,
    option1_ar TEXT NOT NULL,
    option1_en TEXT,
    option2_ar TEXT NOT NULL,
    option2_en TEXT,
    option3_ar TEXT,
    option3_en TEXT,
    correct_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Video Questions Table
CREATE TABLE IF NOT EXISTS video_questions (
    id SERIAL PRIMARY KEY,
    video_id TEXT NOT NULL,
    question_ar TEXT NOT NULL,
    option1_ar TEXT NOT NULL,
    option2_ar TEXT NOT NULL,
    option3_ar TEXT,
    correct_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Video Quiz Submissions Table
CREATE TABLE IF NOT EXISTS video_quiz_submissions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    trainee_name TEXT,
    video_id TEXT NOT NULL,
    video_title TEXT,
    score INTEGER,
    passed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    trainee_name TEXT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    level TEXT DEFAULT 'Passengers',
    status TEXT DEFAULT 'accepted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Level Content Table
CREATE TABLE IF NOT EXISTS level_content (
    id SERIAL PRIMARY KEY,
    level TEXT UNIQUE NOT NULL,
    welcome_html TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Course Prices Table
CREATE TABLE IF NOT EXISTS course_prices (
    id SERIAL PRIMARY KEY,
    course_name TEXT UNIQUE NOT NULL,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Grant Permissions & Disable Row Level Security (RLS) for API Access
-- ==============================================================================

ALTER TABLE trainees DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_quiz_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE level_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_prices DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
