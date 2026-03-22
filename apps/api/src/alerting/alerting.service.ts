import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type AlertEvent =
  | 'block_rate_spike'
  | 'verification_blocked'
  | 'adaptive_difficulty_elevated'
  | 'circuit_breaker_opened';

interface AlertPayload {
  event: AlertEvent;
  siteName: string;
  siteId: string;
  summary: string;
  details: Record<string, unknown>;
}

/**
 * Email alerting service with built-in throttling.
 *
 * Sends email alerts for security events like block rate spikes
 * and adaptive difficulty changes. Throttles alerts per event type
 * to prevent inbox flooding during sustained attacks.
 *
 * Configuration via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ALERT_EMAIL
 *
 * If SMTP_HOST is not set, alerting is silently disabled.
 */
@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = new Logger(AlertingService.name);
  private transporter: Transporter | null = null;
  private enabled = false;

  private readonly fromAddress: string;
  private readonly alertRecipient: string;

  /** Throttle: minimum seconds between alerts of the same event+site */
  private readonly throttleWindowMs: number;
  /** Tracks last alert time per event+site key */
  private readonly lastAlertTime = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    this.fromAddress = this.configService.get<string>('SMTP_FROM') ?? 'janus@localhost';
    this.alertRecipient = this.configService.get<string>('ALERT_EMAIL') ?? '';
    this.throttleWindowMs =
      parseInt(this.configService.get<string>('ALERT_THROTTLE_SECONDS') ?? '300', 10) * 1000;
  }

  async onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not configured — email alerting disabled');
      return;
    }

    if (!this.alertRecipient) {
      this.logger.warn('ALERT_EMAIL not configured — email alerting disabled');
      return;
    }

    const port = parseInt(this.configService.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = port === 465;

    this.transporter = createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });

    try {
      await this.transporter.verify();
      this.enabled = true;
      this.logger.log(`Email alerting enabled → ${this.alertRecipient}`);
    } catch (err) {
      this.logger.error(`SMTP verification failed: ${(err as Error).message}`);
      this.transporter = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send an alert email (throttled per event+site).
   * Non-blocking — errors are logged, never thrown.
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    if (!this.enabled || !this.transporter) return;

    // Throttle: skip if we sent the same event for this site recently
    const throttleKey = `${payload.event}:${payload.siteId}`;
    const lastSent = this.lastAlertTime.get(throttleKey) ?? 0;
    if (Date.now() - lastSent < this.throttleWindowMs) {
      return;
    }
    this.lastAlertTime.set(throttleKey, Date.now());

    try {
      const subject = this.formatSubject(payload);
      const html = this.formatBody(payload);

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: this.alertRecipient,
        subject,
        html,
      });

      this.logger.log(`Alert sent: ${payload.event} for site "${payload.siteName}"`);
    } catch (err) {
      this.logger.error(`Failed to send alert email: ${(err as Error).message}`);
    }
  }

  /**
   * Convenience: send a block rate spike alert.
   */
  async alertBlockRateSpike(
    siteId: string,
    siteName: string,
    blockRate: number,
    effectiveDifficulty: number,
  ): Promise<void> {
    await this.sendAlert({
      event: 'block_rate_spike',
      siteId,
      siteName,
      summary: `Block rate is ${Math.round(blockRate * 100)}% — adaptive difficulty raised to ${effectiveDifficulty}`,
      details: {
        blockRate: `${Math.round(blockRate * 100)}%`,
        effectiveDifficulty,
      },
    });
  }

  /**
   * Convenience: send a high-risk verification alert.
   */
  async alertHighRiskVerification(
    siteId: string,
    siteName: string,
    riskScore: number,
    anomalies: string[],
    countryCode: string | null,
    ipAddress: string,
  ): Promise<void> {
    await this.sendAlert({
      event: 'verification_blocked',
      siteId,
      siteName,
      summary: `Blocked verification with risk score ${riskScore}`,
      details: {
        riskScore,
        anomalies,
        countryCode,
        ipAddress,
      },
    });
  }

  private formatSubject(payload: AlertPayload): string {
    const labels: Record<AlertEvent, string> = {
      block_rate_spike: 'Block Rate Spike',
      verification_blocked: 'Verification Blocked',
      adaptive_difficulty_elevated: 'Difficulty Elevated',
      circuit_breaker_opened: 'Circuit Breaker Opened',
    };
    return `[Janus] ${labels[payload.event] ?? payload.event} — ${payload.siteName}`;
  }

  private formatBody(payload: AlertPayload): string {
    const detailRows = Object.entries(payload.details)
      .map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        return `<tr><td style="padding:4px 12px 4px 0;color:#a1a1aa;font-size:13px">${key}</td><td style="padding:4px 0;color:#fff;font-size:13px">${this.escapeHtml(displayValue)}</td></tr>`;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <span style="font-size:18px;font-weight:600;color:#fff">Janus</span>
      <span style="background:#27272a;color:#a1a1aa;font-size:11px;padding:2px 6px;border-radius:4px">${this.escapeHtml(payload.event)}</span>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:20px">
      <p style="margin:0 0 4px;font-size:14px;font-weight:500;color:#fff">${this.escapeHtml(payload.siteName)}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa">${this.escapeHtml(payload.summary)}</p>
      <table style="border-collapse:collapse">${detailRows}</table>
    </div>
    <p style="margin:24px 0 0;font-size:11px;color:#52525b">
      This alert was sent by your Janus instance. Configure alerting in your environment variables.
    </p>
  </div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
