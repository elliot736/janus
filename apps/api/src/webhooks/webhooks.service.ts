import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { sites } from '../db/schema';
import { eq } from 'drizzle-orm';

export type WebhookEvent = 'verification.blocked' | 'threshold.exceeded' | 'anomaly.detected';

interface WebhookPayload {
  event: WebhookEvent;
  siteId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Fire a webhook event for a site. The webhook URL and secret are
   * stored in site settings. The payload is signed with HMAC-SHA256
   * so the receiver can verify authenticity.
   */
  async fire(siteId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    try {
      const [site] = await this.db
        .select({ settings: sites.settings })
        .from(sites)
        .where(eq(sites.id, siteId));

      const settings = site?.settings as Record<string, unknown> | null;
      const webhookUrl = settings?.webhookUrl as string | undefined;
      const webhookSecret = settings?.webhookSecret as string | undefined;

      if (!webhookUrl) return;

      const payload: WebhookPayload = {
        event,
        siteId,
        timestamp: new Date().toISOString(),
        data,
      };

      const body = JSON.stringify(payload);
      const signature = webhookSecret
        ? createHmac('sha256', webhookSecret).update(body).digest('hex')
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Janus-Event': event,
      };
      if (signature) {
        headers['X-Janus-Signature'] = `sha256=${signature}`;
      }

      // Fire and forget — don't block verification flow
      fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      }).catch((err) => {
        this.logger.warn(`Webhook delivery failed for site ${siteId}: ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`Webhook lookup failed for site ${siteId}: ${(err as Error).message}`);
    }
  }
}
