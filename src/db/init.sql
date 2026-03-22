CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS job_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'em_fila',
    'processando',
    'concluido',
    'falhou',
    'reprocessando',
    'cancelado'
  )),
  payload JSONB,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS telemetria_sensores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idDispositivo INT NOT NULL,
  horaColeta TIMESTAMPTZ NOT NULL,
  tipoSensor TEXT NOT NULL,
  naturezaLeitura TEXT NOT NULL,
  valorColetado TEXT NULL,
  jobId UUID REFERENCES job_status_logs(id) ON DELETE SET NULL
);