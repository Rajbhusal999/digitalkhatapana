-- Supabase Schema (Trimmed)

CREATE TABLE IF NOT EXISTS registered_schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL,
    address TEXT,
    school_email TEXT UNIQUE NOT NULL,
    emis TEXT,
    principal_name TEXT,
    principal_phone TEXT,
    accountant_name TEXT,
    accountant_phone TEXT,
    logo TEXT,
    status TEXT DEFAULT 'pending',
    otp TEXT,
    otp_used BOOLEAN DEFAULT false,
    permanent_password TEXT,
    subscription JSONB DEFAULT '{"plan": "free", "status": "active", "expires_at": null}'::jsonb,
    payment_method TEXT,
    transaction_code TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ledger Headings (Income/Expense categories)
CREATE TABLE IF NOT EXISTS ledger_headings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ledger Subheadings
CREATE TABLE IF NOT EXISTS ledger_subheadings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    heading_id UUID REFERENCES ledger_headings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bank Nagadi Kitaab (Master-Detail Structure)
CREATE TABLE IF NOT EXISTS bnk_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    page_no TEXT,
    fiscal_year TEXT DEFAULT '2083/84',
    transaction_date DATE NOT NULL,
    voucher_no TEXT,
    particulars TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS bnk_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES bnk_vouchers(id) ON DELETE CASCADE,
    entry_type TEXT CHECK (entry_type IN ('income', 'expense')),
    heading_id UUID REFERENCES ledger_headings(id) ON DELETE SET NULL,
    subheading_id UUID REFERENCES ledger_subheadings(id) ON DELETE SET NULL,
    cash_debit NUMERIC DEFAULT 0,
    cash_credit NUMERIC DEFAULT 0,
    bank_debit NUMERIC DEFAULT 0,
    bank_credit NUMERIC DEFAULT 0,
    budget_kharcha NUMERIC DEFAULT 0,
    peski_dieko NUMERIC DEFAULT 0,
    peski_farchiyeko NUMERIC DEFAULT 0,
    bibidh_debit NUMERIC DEFAULT 0,
    bibidh_credit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Aamdani Khata (Income Ledger)
CREATE TABLE IF NOT EXISTS aamdani_khata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    income_date DATE NOT NULL,
    subheading_id UUID REFERENCES ledger_subheadings(id) ON DELETE SET NULL,
    receipt_no TEXT,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Kharcha Khata (Expense Ledger)
CREATE TABLE IF NOT EXISTS kharcha_khata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    subheading_id UUID REFERENCES ledger_subheadings(id) ON DELETE SET NULL,
    voucher_no TEXT,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Opening Balances (Gata Barsha Ko Alya)
CREATE TABLE IF NOT EXISTS opening_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    fiscal_year TEXT DEFAULT '2083/84',
    transaction_date DATE NOT NULL,
    voucher_no TEXT,
    subheading_id UUID REFERENCES ledger_subheadings(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =================================================================
-- AI TEACHER ASSISTANT ("PedagogyAI") SCHEMA (PostgreSQL + pgvector)
-- =================================================================

-- 1. Enable pgvector and uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Teachers / Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Teacher Guides / Curricula table
CREATE TABLE IF NOT EXISTS teacher_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    grade_level TEXT,
    subject TEXT,
    file_url TEXT,
    raw_content TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Document Chunks with Vector Embeddings (for RAG search)
CREATE TABLE IF NOT EXISTS guide_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES teacher_guides(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768), -- Size for Google Gemini (text-embedding-004)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS guide_chunks_embedding_idx ON guide_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. Lesson Plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    guide_id UUID REFERENCES teacher_guides(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    duration_minutes INT DEFAULT 45,
    objectives JSONB,
    timeline JSONB, -- [ { "phase": "Warm-up", "duration": 5, "activity": "..." } ]
    assessment_notes TEXT,
    differentiated_strategies JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Teaching Materials table
CREATE TABLE IF NOT EXISTS teaching_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL, -- 'diy_prop', 'worksheet', 'flashcard', 'presentation'
    title TEXT NOT NULL,
    required_supplies TEXT[],
    step_by_step_instructions JSONB,
    printable_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Chat Conversations & Messages
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    guide_id UUID REFERENCES teacher_guides(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'New Lesson Planning Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context_used JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
