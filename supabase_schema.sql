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
