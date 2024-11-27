import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas
export const getContactsDuration = new Trend('get_dummy_duration', true);
export const getContactsFailedRate = new Rate('get_dummy_failed_rate');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Gradual aumento inicial
    { duration: '1m', target: 100 },  // Aumenta carga para 100 VUs
    { duration: '1m', target: 150 },  // Incrementa para 150 VUs
    { duration: '1m', target: 200 },  // Reduz carga máxima para 200 VUs
    { duration: '1m', target: 0 },    // Ramp-down para 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.12'],        // Menos de 12% de erros permitidos
    http_req_duration: ['p(95)<1000'],    // 95% das requisições abaixo de 1s
  },
};

// Geração de relatório
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
  };
}

// Teste principal
export default function () {
  const baseUrl = 'https://dummyapi.io/data/api/user';

  // Realiza a requisição HTTP
  const res = http.get(baseUrl);

  // Adiciona dados às métricas
  getContactsDuration.add(res.timings.duration);
  getContactsFailedRate.add(res.status !== 200);

  // Validações
  const isSuccessful = check(res, {
    'get dummy - status 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // Log de erros para análise de outliers
  if (!isSuccessful) {
    console.error(`Erro detectado: Status=${res.status}, Duração=${res.timings.duration}ms`);
  }
}
