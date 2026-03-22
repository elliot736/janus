import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { apiKeys, sites } from '../db/schema';

@Injectable()
export class ApiKeysService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  private generateApiKey(): { raw: string; hash: string } {
    const random = randomBytes(32).toString('base64url');
    const raw = `jns_api_${random}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  private async validateSiteOwnership(siteId: string, userId: string) {
    const [site] = await this.db
      .select({ id: sites.id, ownerId: sites.ownerId })
      .from(sites)
      .where(eq(sites.id, siteId));

    if (!site) throw new NotFoundException('Site not found');
    if (site.ownerId !== userId) throw new ForbiddenException('Access denied');
    return site;
  }

  async create(siteId: string, userId: string, label: string) {
    await this.validateSiteOwnership(siteId, userId);
    const { raw, hash } = this.generateApiKey();

    const [record] = await this.db
      .insert(apiKeys)
      .values({
        siteId,
        userId,
        keyHash: hash,
        label,
      })
      .returning();

    if (!record) throw new Error('Failed to create API key');

    return {
      id: record.id,
      siteId: record.siteId,
      label: record.label,
      key: raw,
      createdAt: record.createdAt,
    };
  }

  async findBySite(siteId: string, userId: string) {
    await this.validateSiteOwnership(siteId, userId);

    return this.db
      .select({
        id: apiKeys.id,
        siteId: apiKeys.siteId,
        label: apiKeys.label,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.siteId, siteId));
  }

  async findAllByUser(userId: string) {
    const rows = await this.db
      .select({
        id: apiKeys.id,
        siteId: apiKeys.siteId,
        siteName: sites.name,
        label: apiKeys.label,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .innerJoin(sites, eq(apiKeys.siteId, sites.id))
      .where(eq(apiKeys.userId, userId));

    return rows;
  }

  async remove(id: string, userId: string) {
    const [key] = await this.db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

    if (!key) throw new NotFoundException('API key not found');

    await this.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

    return { deleted: true };
  }

  async validateKey(rawKey: string) {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash));

    if (!key) return null;

    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id));

    return key;
  }
}
