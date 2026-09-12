-- Afroid Initial Schema + KYC Migration
-- Run in psql connected to afroid database

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(2000),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'unverified',
    kyc_id_type VARCHAR(50),
    kyc_id_masked VARCHAR(50),
    kyc_verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    logo_url VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_org_slug ON organizations(slug);

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS ix_org_members_user ON organization_members(user_id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    ide_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_org_slug UNIQUE (organization_id, slug)
);
CREATE INDEX IF NOT EXISTS ix_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS ix_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS ix_projects_status ON projects(status);

-- Startup Profiles
CREATE TABLE IF NOT EXISTS startup_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    industry VARCHAR(100) NOT NULL,
    stage VARCHAR(20) NOT NULL DEFAULT 'idea',
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    address TEXT,
    website VARCHAR(2000),
    team_size INTEGER DEFAULT 1,
    annual_revenue NUMERIC(15,2) DEFAULT 0,
    annual_revenue_currency VARCHAR(3) DEFAULT 'USD',
    founded_year INTEGER,
    problem_statement TEXT NOT NULL,
    solution_description TEXT NOT NULL,
    technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact_statement TEXT,
    target_markets JSONB NOT NULL DEFAULT '[]'::jsonb,
    sdg_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    revenue_model TEXT,
    customer_count INTEGER DEFAULT 0,
    jobs_created INTEGER DEFAULT 0,
    previous_funding JSONB NOT NULL DEFAULT '[]'::jsonb,
    documents JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_profiles_project ON startup_profiles(project_id);
CREATE INDEX IF NOT EXISTS ix_profiles_country ON startup_profiles(country);
CREATE INDEX IF NOT EXISTS ix_profiles_industry ON startup_profiles(industry);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    funder VARCHAR(300) NOT NULL,
    funder_type VARCHAR(30),
    funding_type VARCHAR(30) NOT NULL,
    amount_min NUMERIC(15,2),
    amount_max NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    eligible_regions TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    eligible_sectors TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    eligible_stages TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    eligibility_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    deadline DATE,
    is_rolling BOOLEAN NOT NULL DEFAULT false,
    cycle VARCHAR(50),
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    application_url VARCHAR(2000),
    source_url VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_opp_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS ix_opp_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS ix_opp_funding_type ON opportunities(funding_type);
CREATE INDEX IF NOT EXISTS ix_opp_regions ON opportunities USING gin(eligible_regions);
CREATE INDEX IF NOT EXISTS ix_opp_sectors ON opportunities USING gin(eligible_sectors);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,4) NOT NULL,
    match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_match_profile_opp UNIQUE (profile_id, opportunity_id)
);
CREATE INDEX IF NOT EXISTS ix_matches_profile ON matches(profile_id);
CREATE INDEX IF NOT EXISTS ix_matches_opportunity ON matches(opportunity_id);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    user_id UUID NOT NULL REFERENCES users(id),
    filled_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    missing_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    field_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    narrative_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_apps_project ON applications(project_id);
CREATE INDEX IF NOT EXISTS ix_apps_opportunity ON applications(opportunity_id);
CREATE INDEX IF NOT EXISTS ix_apps_status ON applications(status);

-- Certification Jobs
CREATE TABLE IF NOT EXISTS certification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES users(id),
    jurisdictions TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    compliance_report JSONB,
    compliance_score NUMERIC(5,2),
    certificate_id VARCHAR(100),
    certificate_url VARCHAR(2000),
    ip_report JSONB,
    originality_score NUMERIC(5,2),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cert_project ON certification_jobs(project_id);
CREATE INDEX IF NOT EXISTS ix_cert_status ON certification_jobs(status);

-- Designations (certify service)
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    submission_id VARCHAR(255),
    project_name VARCHAR(255) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    designation VARCHAR(50) NOT NULL,
    rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    compliance JSONB NOT NULL DEFAULT '{}'::jsonb,
    originality JSONB NOT NULL DEFAULT '{}'::jsonb,
    issuer VARCHAR(255) NOT NULL DEFAULT 'AfroID Certify Engine',
    validity_days INTEGER NOT NULL DEFAULT 365,
    audit_hash VARCHAR(128),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(500),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_rt_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_rt_expires ON refresh_tokens(expires_at);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,
    name VARCHAR(100) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alembic version tracking
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('002_kyc_users') ON CONFLICT DO NOTHING;

-- Seed opportunities
INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Tony Elumelu Foundation (TEF) Entrepreneurship Programme', 'The Tony Elumelu Foundation', 'Philanthropic Foundation', 'Grant', 5000, 5000, 'USD', ARRAY['Pan-African','Nigeria','Kenya','Ghana','South Africa','Rwanda','Uganda','Egypt'], ARRAY['All','Agritech','Fintech','Healthtech','Edtech','Clean Energy'], ARRAY['Idea','MVP','Seed'], '2026-03-31', false, 'Non-refundable seed capital of $5,000, 12 weeks of business management training, and global mentorship for young African entrepreneurs.', 'https://www.tefconnect.com', 'https://tonyelumelufoundation.org', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Africa Startup Initiative Programme (ASIP) Accelerator', 'African Development Bank & Startupbootcamp AfriTech', 'Multilateral DFI', 'Grant & Equity-Free', 18000, 100000, 'USD', ARRAY['Pan-African','Senegal','Ivory Coast','Nigeria','Kenya','Morocco','South Africa'], ARRAY['Fintech','Agritech','Climate Tech','Supply Chain','Healthtech'], ARRAY['MVP','Seed','Early'], '2026-11-30', false, 'Catalytic grant funding, pilot corporate partner integration, and $750k+ in partner credits for top African early-stage tech startups.', 'https://sbcafritech.com', 'https://www.afdb.org', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Google for Startups Accelerator: Africa', 'Google for Startups', 'Corporate', 'Equity-Free Support & Cloud Credits', 50000, 350000, 'USD', ARRAY['Pan-African','Nigeria','Kenya','South Africa','Ghana','Rwanda','Ethiopia','Egypt'], ARRAY['AI & Machine Learning','Fintech','Logistics','Healthtech','Sustainability'], ARRAY['Seed','Early','Growth'], '2026-08-15', false, 'Equity-free mentorship from Google AI engineers, $350k Google Cloud credits, technical project sprints, and global investor access.', 'https://startup.google.com/programs/accelerator/africa', 'https://startup.google.com', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Nigeria Startup Act Labeling & Tax Incentive', 'National Information Technology Development Agency (NITDA)', 'Government Authority', 'Tax Credit & Exemption', 10000, 500000, 'USD', ARRAY['Nigeria'], ARRAY['Tech-Enabled','Software','Hardware','Fintech','Agritech','Healthtech'], ARRAY['Idea','MVP','Seed','Early','Growth'], NULL, true, 'Four-year pioneer status tax holiday, R&D tax credits, fast-tracked IP registration, and access to the Nigeria Startup Investment Seed Fund.', 'https://startup.gov.ng', 'https://nitda.gov.ng', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Mastercard Foundation Young Africa Works Challenge Fund', 'Mastercard Foundation', 'Philanthropic Foundation', 'Grant', 100000, 500000, 'USD', ARRAY['Ghana','Kenya','Nigeria','Rwanda','Senegal','Uganda','Ethiopia'], ARRAY['Agritech','Digital Economy','Youth Employment','Manufacturing'], ARRAY['Seed','Early','Growth'], '2026-10-31', false, 'Large-scale grant funding for scalable technology solutions that directly create and sustain dignifying jobs for African youth and women.', 'https://mastercardfdn.org/all/young-africa-works', 'https://mastercardfdn.org', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'develoPPP Ventures Africa', 'German Federal Ministry for Economic Cooperation and Development (BMZ)', 'Bilateral DFI', 'Matching Grant', 100000, 100000, 'EUR', ARRAY['Ghana','Kenya','Nigeria','Rwanda','South Africa','Tanzania','Ivory Coast'], ARRAY['Climate Tech','Agritech','Circularity','Healthtech','Edtech'], ARRAY['Seed','Early'], '2026-06-30', false, 'Matching grant of up to EUR 100,000 for early-stage impact startups that combine commercial viability with positive development impact.', 'https://www.developpp.de/en/ventures', 'https://www.developpp.de', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'GSMA Innovation Fund for Climate Resilience and Adaptation', 'GSMA & UK FCDO', 'Industry Body & Bilateral DFI', 'Grant', 125000, 300000, 'GBP', ARRAY['Pan-African','Kenya','Nigeria','Ethiopia','Tanzania','Madagascar'], ARRAY['Mobile Tech','Climate Resilience','Agritech','Disaster Response'], ARRAY['MVP','Seed','Early'], '2026-09-15', false, 'Equity-free grants of GBP 100k to GBP 250k for digital innovators leveraging mobile network operator assets to build climate resilience.', 'https://www.gsma.com/innovationfund', 'https://www.gsma.com', 'active', NOW(), NOW());

INSERT INTO opportunities (id, title, funder, funder_type, funding_type, amount_min, amount_max, currency, eligible_regions, eligible_sectors, eligible_stages, deadline, is_rolling, description, application_url, source_url, status, created_at, updated_at) VALUES (uuid_generate_v4(), 'Kenya Startup Bill Innovation Fund', 'Kenya National Innovation Agency (KeNIA)', 'Government Authority', 'Grant & Subsidized Incubation', 15000, 75000, 'USD', ARRAY['Kenya'], ARRAY['Fintech','Agritech','Clean Energy','Creative Economy','Healthtech'], ARRAY['Idea','MVP','Seed'], NULL, true, 'Government innovation grants, credit guarantee schemes, and subsidized incubation for registered Kenyan tech startups.', 'https://www.innovationagency.go.ke', 'https://www.innovationagency.go.ke', 'active', NOW(), NOW());
