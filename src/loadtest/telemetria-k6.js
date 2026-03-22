import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3004';
const ENDPOINT = `${BASE_URL}/telemetria-sensores`;
const MAX_SLEEP = 50;

const SENSORES_ANALOGICOS = [
  'temperatura',
  'umidade',
  'luminosidade',
  'vibracao',
  'nivel_reservatorio',
];

const SENSORES_DISCRETOS = [
  'presenca',
  'porta',
  'bomba',
  'alarme',
];

const VALORES_DISCRETOS = [
  'ligado',
  'desligado',
  'aberto',
  'fechado',
  'presenca',
  'ausencia',
];

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '30s', target: 200 },
    { duration: '45s', target: 400 },
    { duration: '20s', target: 400 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90'],
  },
};

function selecionaItemAleatorio(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function analogicoPayload() {
  return {
    idDispositivo: (__VU - 1) * 1000 + __ITER + 1,
    tipoSensor: selecionaItemAleatorio(SENSORES_ANALOGICOS),
    naturezaLeitura: 'analogica',
    valorColetado: (Math.random() * 100).toFixed(2),
  };
}

function discretoPayload() {
  return {
    idDispositivo: (__VU - 1) * 1000 + __ITER + 1,
    tipoSensor: selecionaItemAleatorio(SENSORES_DISCRETOS),
    naturezaLeitura: 'discreta',
    valorColetado: selecionaItemAleatorio(VALORES_DISCRETOS),
  };
}

function buildPayload() {
  return Math.random() > 0.5 ? analogicoPayload() : discretoPayload();
}

export default function () {
  const payload = buildPayload();

  const response = http.post(ENDPOINT, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'status 202': (res) => res.status === 202,
    'retornou jobId': (res) => {
      try {
        return typeof res.json('jobId') === 'string';
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * (MAX_SLEEP / 1000));
}
