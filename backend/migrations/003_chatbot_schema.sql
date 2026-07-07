
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id              VARCHAR(64)     PRIMARY KEY, -- client-generated UUID, persisted in browser storage
  user_id         INT             NULL,
  started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  escalated       TINYINT(1)      NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chatbot_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      VARCHAR(64)     NOT NULL,
  role            ENUM('user','assistant') NOT NULL,
  message         TEXT            NOT NULL,
  -- which knowledge-base sources were retrieved for this turn (for analytics / debugging RAG quality)
  matched_sources VARCHAR(500)    NULL,
  was_fallback    TINYINT(1)      NOT NULL DEFAULT 0, -- true if no KB match, generic/escalation response used
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
  INDEX idx_chatbot_logs_session (session_id)
) ENGINE=InnoDB;
