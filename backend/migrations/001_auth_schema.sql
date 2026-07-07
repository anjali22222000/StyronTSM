-- Styron TSM — Phase 1 schema (auth + admin auth)
-- Run via: npm run migrate  (or paste manually into MySQL)


-- ---------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)    NULL,
  email           VARCHAR(190)    NOT NULL UNIQUE,
  phone           VARCHAR(20)     NULL,
  password_hash   VARCHAR(255)    NULL, -- passwordless (email OTP) login; kept nullable for future password-based admin tools
  is_verified     TINYINT(1)      NOT NULL DEFAULT 0,
  status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- OTP VERIFICATIONS (registration / email verification)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_verifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(190)    NOT NULL,
  otp_hash        VARCHAR(255)    NOT NULL,
  purpose         ENUM('login') NOT NULL DEFAULT 'login', -- single passwordless flow: covers both new + returning users
  attempts        INT             NOT NULL DEFAULT 0,
  max_attempts    INT             NOT NULL DEFAULT 5,
  expires_at      DATETIME        NOT NULL,
  consumed_at     DATETIME        NULL,
  last_sent_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email_purpose (email, purpose)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- ADMINS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)    NOT NULL,
  email           VARCHAR(190)    NOT NULL UNIQUE,
  password_hash   VARCHAR(255)    NOT NULL,
  role            ENUM('super_admin','admin','support') NOT NULL DEFAULT 'admin',
  failed_attempts INT             NOT NULL DEFAULT 0,
  locked_until    DATETIME        NULL,
  last_login_at   DATETIME        NULL,
  status          ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- ADMIN OTPS (2FA on login)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_otps (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  admin_id        INT             NOT NULL,
  otp_hash        VARCHAR(255)    NOT NULL,
  attempts        INT             NOT NULL DEFAULT 0,
  max_attempts    INT             NOT NULL DEFAULT 5,
  expires_at      DATETIME        NOT NULL,
  consumed_at     DATETIME        NULL,
  last_sent_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_otps_admin (admin_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- REFRESH TOKENS (for JWT refresh / secure logout / revocation)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  token_hash      VARCHAR(255)    NOT NULL,
  subject_type    ENUM('user','admin') NOT NULL,
  subject_id      INT             NOT NULL,
  expires_at      DATETIME        NOT NULL,
  revoked_at      DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_subject (subject_type, subject_id)
) ENGINE=InnoDB;
