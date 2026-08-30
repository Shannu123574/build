export const schemaSql = `
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  gateway TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  recovered_amount INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_decisions (
  incident_id TEXT PRIMARY KEY,
  diagnosis_json TEXT,
  rules_json TEXT NOT NULL,
  approved INTEGER NOT NULL,
  action TEXT,
  denial_reason TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  cost INTEGER NOT NULL,
  reference_id TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS audit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL UNIQUE,
  previous_hash TEXT NOT NULL,
  incident_id TEXT,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_limits (
  customer_id TEXT PRIMARY KEY,
  last_contact_at INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL
);
`;
