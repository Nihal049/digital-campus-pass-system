-- ============================================================
-- PostgreSQL Migration: 001_initial_schema.sql
-- Digital Campus Pass System (Batch 17) - PostgreSQL DDL
-- ============================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Campus Gates Table
CREATE TABLE IF NOT EXISTS campus_gates (
    id VARCHAR(36) PRIMARY KEY,
    gate_name VARCHAR(100) NOT NULL,
    gate_number VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pass Types Table (Configurable by Admin)
CREATE TABLE IF NOT EXISTS pass_types (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_duration_hours INT DEFAULT 24,
    requires_approval BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Users Table (RBAC: ADMIN, SECURITY, FACULTY, STUDENT, VISITOR)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    reg_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'SECURITY', 'FACULTY', 'STUDENT', 'VISITOR')),
    department VARCHAR(100),
    course VARCHAR(100),
    year VARCHAR(20),
    section VARCHAR(20),
    phone VARCHAR(25),
    profile_photo TEXT,
    emergency_contact VARCHAR(25),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    reset_token VARCHAR(100),
    reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Digital Passes Table
CREATE TABLE IF NOT EXISTS digital_passes (
    id VARCHAR(36) PRIMARY KEY,
    pass_number VARCHAR(50) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pass_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REVOKED')),
    approved_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    approval_notes TEXT,
    approval_time TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. QR Tokens Table (Anti-Tamper HMAC Verification)
CREATE TABLE IF NOT EXISTS qr_tokens (
    id VARCHAR(36) PRIMARY KEY,
    pass_id VARCHAR(36) NOT NULL REFERENCES digital_passes(id) ON DELETE CASCADE,
    token_signature TEXT NOT NULL,
    nonce VARCHAR(64) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. Gate Scans Table (Complete Movement Audit Trail)
CREATE TABLE IF NOT EXISTS gate_scans (
    id VARCHAR(36) PRIMARY KEY,
    pass_id VARCHAR(36) NOT NULL REFERENCES digital_passes(id) ON DELETE CASCADE,
    person_id VARCHAR(36) NOT NULL REFERENCES users(id),
    gate_id VARCHAR(36) REFERENCES campus_gates(id),
    gate_name VARCHAR(100) NOT NULL,
    scanner_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    action_type VARCHAR(10) NOT NULL CHECK(action_type IN ('ENTRY', 'EXIT')),
    result VARCHAR(15) NOT NULL CHECK(result IN ('GRANTED', 'DENIED')),
    denial_reason TEXT,
    device_info TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Currently Inside Campus Table
CREATE TABLE IF NOT EXISTS currently_inside (
    id VARCHAR(36) PRIMARY KEY,
    person_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pass_id VARCHAR(36) NOT NULL REFERENCES digital_passes(id) ON DELETE CASCADE,
    gate_id VARCHAR(36) REFERENCES campus_gates(id),
    gate_name VARCHAR(100) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    last_scan_id VARCHAR(36) REFERENCES gate_scans(id)
);

-- 9. Visitors Table
CREATE TABLE IF NOT EXISTS visitors (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(25) NOT NULL,
    organization VARCHAR(150),
    gov_id_type VARCHAR(50),
    gov_id_number VARCHAR(50),
    person_to_meet VARCHAR(100),
    department VARCHAR(100),
    purpose TEXT NOT NULL,
    visit_date DATE DEFAULT CURRENT_DATE,
    expected_arrival TIMESTAMP WITH TIME ZONE,
    entry_time TIMESTAMP WITH TIME ZONE,
    expected_exit_time TIMESTAMP WITH TIME ZONE,
    host_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INVITED' CHECK(status IN ('INVITED', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED')),
    pass_id VARCHAR(36) REFERENCES digital_passes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. System Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_passes_user_id ON digital_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_passes_status ON digital_passes(status);
CREATE INDEX IF NOT EXISTS idx_gate_scans_person ON gate_scans(person_id);
CREATE INDEX IF NOT EXISTS idx_gate_scans_date ON gate_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
