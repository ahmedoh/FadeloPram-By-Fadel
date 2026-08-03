-- SQL Script to Set Up PharmReady Academy Tables in Supabase (Compatible Version)
-- Run this script in the Supabase SQL Editor (SQL Editor -> New Query)

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default owner admin if not exists
INSERT INTO admins (username, password, role)
VALUES ('madmody', 'madmody', 'Owner')
ON CONFLICT (username) DO NOTHING;

-- 2. Trainees Table
CREATE TABLE IF NOT EXISTS trainees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    birth_year INTEGER,
    phone TEXT UNIQUE NOT NULL,
    whatsapp TEXT,
    college TEXT,
    squad TEXT,
    university TEXT,
    training_branch TEXT,
    pharmacy_group TEXT DEFAULT 'صيدليات آل مغاوري',
    target_level TEXT,
    security_answer TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    telegram_handle TEXT DEFAULT '',
    telegram_chat_id TEXT DEFAULT '',
    current_level TEXT DEFAULT 'Passengers',
    status TEXT DEFAULT 'pending', -- pending, accepted, blocked, rejected
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '', -- base64 or URL
    reject_reason TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS pharmacy_group TEXT DEFAULT 'صيدليات آل مغاوري';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS telegram_handle TEXT DEFAULT '';
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT '';

-- 3. Curriculum Table (Folders and Lessons)
CREATE TABLE IF NOT EXISTS curriculum (
    id SERIAL PRIMARY KEY,
    level TEXT NOT NULL, -- Passengers, Starters, Movers, etc.
    title TEXT NOT NULL,
    content_html TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 1,
    parent_id INTEGER REFERENCES curriculum(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'folder', -- folder, video, content
    video_url TEXT DEFAULT '',
    video_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Progress Table (Video watch history and exam details per level)
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    level TEXT NOT NULL,
    watched_videos TEXT DEFAULT '', -- Comma-separated video IDs
    exam_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (email, level)
);

-- 5. Promotions Table (Completed levels and certificates)
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    certificate_template TEXT DEFAULT '',
    certificate_url TEXT DEFAULT '',
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Questions Table (Level exams questions)
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
    correct_index INTEGER NOT NULL, -- 0, 1, or 2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Video Questions Table (In-video interactive questions)
CREATE TABLE IF NOT EXISTS video_questions (
    id SERIAL PRIMARY KEY,
    video_id TEXT NOT NULL,
    question_ar TEXT NOT NULL,
    option1_ar TEXT NOT NULL,
    option2_ar TEXT NOT NULL,
    option3_ar TEXT,
    correct_index INTEGER NOT NULL, -- 0, 1, or 2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Video Quiz Submissions Table
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

-- 9. Level Content Table (Welcome messages for levels)
CREATE TABLE IF NOT EXISTS level_content (
    id SERIAL PRIMARY KEY,
    level TEXT UNIQUE NOT NULL,
    welcome_html TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
