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
