import { AlertingService } from './alerting.service';
import { ConfigService } from '@nestjs/config';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

import { createTransport } from 'nodemailer';

describe('AlertingService', () => {
  let service: AlertingService;
  let mockTransporter: any;

  function createConfigService(overrides: Record<string, string> = {}): ConfigService {
    const config: Record<string, string> = {
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
      SMTP_FROM: 'janus@test.com',
      ALERT_EMAIL: 'admin@test.com',
      ALERT_THROTTLE_SECONDS: '1', // 1 second for fast tests
      ...overrides,
    };
    return {
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransporter = {
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };
    (createTransport as jest.Mock).mockReturnValue(mockTransporter);

    service = new AlertingService(createConfigService());
    await service.onModuleInit();
  });

  describe('onModuleInit()', () => {
    it('should enable alerting when SMTP is configured', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable alerting when SMTP_HOST is missing', async () => {
      const svc = new AlertingService(createConfigService({ SMTP_HOST: '' }));
      await svc.onModuleInit();
      expect(svc.isEnabled()).toBe(false);
    });

    it('should disable alerting when ALERT_EMAIL is missing', async () => {
      const svc = new AlertingService(createConfigService({ ALERT_EMAIL: '' }));
      await svc.onModuleInit();
      expect(svc.isEnabled()).toBe(false);
    });

    it('should disable alerting when SMTP verification fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('SMTP unreachable'));
      const svc = new AlertingService(createConfigService());
      await svc.onModuleInit();
      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe('sendAlert()', () => {
    it('should send an email with correct subject and recipient', async () => {
      await service.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-1',
        siteName: 'Test Site',
        summary: 'Blocked high-risk request',
        details: { riskScore: 85 },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'janus@test.com',
          to: 'admin@test.com',
          subject: '[Janus] Verification Blocked — Test Site',
        }),
      );
    });

    it('should include HTML body with details', async () => {
      await service.sendAlert({
        event: 'block_rate_spike',
        siteId: 'site-1',
        siteName: 'Production',
        summary: 'Block rate at 45%',
        details: { blockRate: '45%', effectiveDifficulty: 7 },
      });

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain('Production');
      expect(call.html).toContain('45%');
      expect(call.html).toContain('block_rate_spike');
      expect(call.subject).toContain('Block Rate Spike');
    });

    it('should throttle duplicate alerts for same event+site', async () => {
      const payload = {
        event: 'verification_blocked' as const,
        siteId: 'site-1',
        siteName: 'Test',
        summary: 'Blocked',
        details: {},
      };

      await service.sendAlert(payload);
      await service.sendAlert(payload); // should be throttled

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should allow alerts for different sites', async () => {
      await service.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-1',
        siteName: 'Site 1',
        summary: 'Blocked',
        details: {},
      });
      await service.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-2',
        siteName: 'Site 2',
        summary: 'Blocked',
        details: {},
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should allow alerts for different events on same site', async () => {
      await service.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-1',
        siteName: 'Test',
        summary: 'Blocked',
        details: {},
      });
      await service.sendAlert({
        event: 'block_rate_spike',
        siteId: 'site-1',
        siteName: 'Test',
        summary: 'Spike',
        details: {},
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should not send when alerting is disabled', async () => {
      const svc = new AlertingService(createConfigService({ SMTP_HOST: '' }));
      await svc.onModuleInit();

      await svc.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-1',
        siteName: 'Test',
        summary: 'Blocked',
        details: {},
      });

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle sendMail errors gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendAlert({
          event: 'verification_blocked',
          siteId: 'site-1',
          siteName: 'Test',
          summary: 'Blocked',
          details: {},
        }),
      ).resolves.toBeUndefined();
    });

    it('should escape HTML in alert body', async () => {
      await service.sendAlert({
        event: 'verification_blocked',
        siteId: 'site-1',
        siteName: '<script>alert("xss")</script>',
        summary: 'Test',
        details: {},
      });

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).not.toContain('<script>');
      expect(call.html).toContain('&lt;script&gt;');
    });
  });

  describe('alertBlockRateSpike()', () => {
    it('should send a block rate spike alert', async () => {
      await service.alertBlockRateSpike('site-1', 'Prod', 0.45, 7);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[Janus] Block Rate Spike — Prod',
        }),
      );
    });
  });

  describe('alertHighRiskVerification()', () => {
    it('should send a high risk verification alert', async () => {
      await service.alertHighRiskVerification(
        'site-1', 'Prod', 92, ['datacenter_ip', 'vpn_detected'], 'US', '1.2.3.4',
      );

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain('datacenter_ip');
      expect(call.html).toContain('92');
    });
  });
});
