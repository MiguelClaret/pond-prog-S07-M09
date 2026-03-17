CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS job_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT NOT NULL,
  queue_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'em_fila',
    'processando',
    'concluido',
    'falhou',
    'reprocessando',
    'cancelado'
  )),
  message TEXT,
  payload JSONB,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
