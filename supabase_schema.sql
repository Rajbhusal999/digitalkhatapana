-- Supabase Database Schema for Digital Khata Pana
-- Run this script in the Supabase SQL Editor to create the necessary tables.

-- 1. Registered Schools Table
CREATE TABLE IF NOT EXISTS public.registered_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT,
    address TEXT,
    school_email TEXT UNIQUE NOT NULL,
    emis TEXT,
    principal_name TEXT,
    principal_phone TEXT,
    accountant_name TEXT,
    accountant_phone TEXT,
    logo TEXT,
    status TEXT DEFAULT 'Pending',
    otp TEXT,
    otp_used BOOLEAN DEFAULT false,
    permanent_password TEXT,
    subscription TEXT,
    payment_method TEXT,
    transaction_code TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    particulars TEXT,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    voucher_no TEXT,
    source TEXT,
    recorded_by TEXT,
    payment_method TEXT DEFAULT 'bank',
    fiscal_year TEXT,
    subheading_id TEXT,
    subheading_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    UNIQUE(school_id, category)
);

-- 4. Feedbacks Table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    message TEXT NOT NULL,
    replied BOOLEAN DEFAULT false,
    reply_text TEXT,
    date TEXT
);

-- 5. Ledger Headings Table
CREATE TABLE IF NOT EXISTS public.ledger_headings (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    name_ne TEXT NOT NULL,
    name_en TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Set Row Level Security (RLS) to allow all operations for easy setup
-- (Note: For a real production app, you should restrict these policies to authenticated users only)
ALTER TABLE public.registered_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_headings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read/write on registered_schools" ON public.registered_schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on feedbacks" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on ledger_headings" ON public.ledger_headings FOR ALL USING (true) WITH CHECK (true);
