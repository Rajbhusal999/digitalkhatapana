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

-- Bank Nagadi Kitaab (Bank Cash Book)
CREATE TABLE IF NOT EXISTS bank_nagadi_kitaab (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES registered_schools(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    particulars TEXT,
    voucher_or_receipt_no TEXT,
    cash_in NUMERIC DEFAULT 0,
    cash_out NUMERIC DEFAULT 0,
    bank_in NUMERIC DEFAULT 0,
    bank_out NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
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
