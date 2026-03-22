import http from 'k6/http';
import { check, sleep } from 'k6';
import { crypto } from 'k6/experimental/webcrypto';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const SITE_KEY = __ENV.SITE_KEY || 'jns_site_live_test';

export default function () {
  // Request challenge
  const challengeRes = http.post(
    `${BASE_URL}/api/v1/challenge`,
    JSON.stringify({}),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Key': SITE_KEY,
      },
    },
  );

  check(challengeRes, {
    'challenge status is 200': (r) => r.status === 200,
    'challenge has id': (r) => JSON.parse(r.body).challengeId !== undefined,
  });

  sleep(1);
}
