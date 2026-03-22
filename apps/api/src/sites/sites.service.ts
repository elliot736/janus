import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { sites } from '../db/schema';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  private generateSiteKey(): string {
    const random = randomBytes(24).toString('base64url');
    return `jns_site_live_${random}`;
  }

  private generateSecretKey(): { raw: string; hash: string } {
    const random = randomBytes(32).toString('base64url');
    const raw = `jns_secret_live_${random}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  async create(ownerId: string, dto: CreateSiteDto) {
    const siteKey = this.generateSiteKey();
    const { raw: secretKeyRaw, hash: secretKeyHash } =
      this.generateSecretKey();

    const [site] = await this.db
      .insert(sites)
      .values({
        name: dto.name,
        domain: dto.domain,
        siteKey,
        secretKey: secretKeyHash,
        ownerId,
      })
      .returning();

    if (!site) throw new Error('Failed to create site');

    return {
      ...site,
      secretKey: secretKeyRaw, // Only returned once at creation
    };
  }

  async findAllByOwner(ownerId: string) {
    return this.db
      .select({
        id: sites.id,
        name: sites.name,
        domain: sites.domain,
        siteKey: sites.siteKey,
        settings: sites.settings,
        isActive: sites.isActive,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      })
      .from(sites)
      .where(eq(sites.ownerId, ownerId));
  }

  async findOneByOwner(id: string, ownerId: string) {
    const [site] = await this.db
      .select({
        id: sites.id,
        name: sites.name,
        domain: sites.domain,
        siteKey: sites.siteKey,
        settings: sites.settings,
        isActive: sites.isActive,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      })
      .from(sites)
      .where(and(eq(sites.id, id), eq(sites.ownerId, ownerId)));

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  async findBySiteKey(siteKey: string) {
    const [site] = await this.db
      .select()
      .from(sites)
      .where(and(eq(sites.siteKey, siteKey), eq(sites.isActive, true)));

    if (!site) {
      throw new NotFoundException('Site not found or inactive');
    }

    return site;
  }

  async findBySecretKeyHash(secretKeyRaw: string) {
    const hash = createHash('sha256').update(secretKeyRaw).digest('hex');
    const [site] = await this.db
      .select()
      .from(sites)
      .where(eq(sites.secretKey, hash));

    if (!site) {
      throw new NotFoundException('Invalid secret key');
    }

    return site;
  }

  async update(id: string, ownerId: string, dto: UpdateSiteDto) {
    await this.findOneByOwner(id, ownerId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.domain !== undefined) updateData.domain = dto.domain;
    if (dto.settings !== undefined) updateData.settings = dto.settings;

    const [updated] = await this.db
      .update(sites)
      .set(updateData)
      .where(and(eq(sites.id, id), eq(sites.ownerId, ownerId)))
      .returning({
        id: sites.id,
        name: sites.name,
        domain: sites.domain,
        siteKey: sites.siteKey,
        settings: sites.settings,
        isActive: sites.isActive,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      });

    if (!updated) throw new NotFoundException('Site not found');

    return updated;
  }

  async remove(id: string, ownerId: string) {
    const site = await this.findOneByOwner(id, ownerId);

    await this.db
      .delete(sites)
      .where(and(eq(sites.id, id), eq(sites.ownerId, ownerId)));

    return site;
  }

  async rotateKeys(id: string, ownerId: string) {
    await this.findOneByOwner(id, ownerId);

    const newSiteKey = this.generateSiteKey();
    const { raw: newSecretKeyRaw, hash: newSecretKeyHash } =
      this.generateSecretKey();

    const [updated] = await this.db
      .update(sites)
      .set({
        siteKey: newSiteKey,
        secretKey: newSecretKeyHash,
        updatedAt: new Date(),
      })
      .where(and(eq(sites.id, id), eq(sites.ownerId, ownerId)))
      .returning({
        id: sites.id,
        name: sites.name,
        domain: sites.domain,
        siteKey: sites.siteKey,
        settings: sites.settings,
        isActive: sites.isActive,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      });

    if (!updated) throw new NotFoundException('Site not found');

    return {
      ...updated,
      secretKey: newSecretKeyRaw, // Only returned once during rotation
    };
  }
}
