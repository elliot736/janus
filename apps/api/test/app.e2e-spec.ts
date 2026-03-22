import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Janus API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Skip if no DATABASE_URL (CI without services)
    if (!process.env.DATABASE_URL) {
      console.log('Skipping e2e tests: DATABASE_URL not set');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Health', () => {
    it('GET /health should return ok', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });

    it('GET /ready should check DB and Redis', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .get('/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.checks).toBeDefined();
          expect(res.body.checks.database).toBe('ok');
        });
    });
  });

  describe('Metrics', () => {
    it('GET /metrics should return prometheus format', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('janus_verifications_total');
          expect(res.text).toContain('janus_challenges_total');
        });
    });
  });

  describe('Challenge', () => {
    it('POST /api/v1/challenge without X-Site-Key should return 400', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .post('/api/v1/challenge')
        .send({})
        .expect(400);
    });

    it('POST /api/v1/challenge with invalid site key should return 404', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .post('/api/v1/challenge')
        .set('X-Site-Key', 'jns_site_live_invalid')
        .send({})
        .expect(404);
    });
  });

  describe('Siteverify', () => {
    it('POST /api/v1/siteverify without secret should return 400', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .post('/api/v1/siteverify')
        .send({})
        .expect(400);
    });

    it('POST /api/v1/siteverify with invalid secret should return 404', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .post('/api/v1/siteverify')
        .send({ secret: 'jns_secret_live_invalid', token: 'fake' })
        .expect(404);
    });
  });

  describe('Auth', () => {
    it('GET /api/auth/ok should return ok', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .get('/api/auth/ok')
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });
    });
  });

  describe('Protected routes', () => {
    it('GET /api/v1/sites without auth should return 401', () => {
      if (!app) return;
      return request(app.getHttpServer())
        .get('/api/v1/sites')
        .expect(401);
    });
  });
});
