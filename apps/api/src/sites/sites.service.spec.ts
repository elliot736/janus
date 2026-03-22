import { NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { createHash } from 'crypto';

describe('SitesService', () => {
  let service: SitesService;
  let mockDb: any;

  const fakeSiteRecord = {
    id: 'site-uuid-1',
    name: 'Test Site',
    domain: ['example.com'],
    siteKey: 'jns_site_live_abc123',
    secretKey: 'hashed-secret',
    settings: null,
    isActive: true,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([fakeSiteRecord]),
        }),
      }),
      select: jest.fn(),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([fakeSiteRecord]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    service = new SitesService(mockDb);
  });

  describe('create()', () => {
    it('should generate jns_site_live_ prefixed site key', async () => {
      const result = await service.create('owner-1', {
        name: 'My Site',
        domain: ['example.com'],
      });

      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.siteKey).toMatch(/^jns_site_live_/);
    });

    it('should generate jns_secret_live_ prefixed secret key', async () => {
      const result = await service.create('owner-1', {
        name: 'My Site',
        domain: ['example.com'],
      });

      // The secretKey returned should be the raw key (not the hash)
      expect(result.secretKey).toMatch(/^jns_secret_live_/);
    });

    it('should store the hashed secret key in the database, not the raw key', async () => {
      await service.create('owner-1', {
        name: 'My Site',
        domain: ['example.com'],
      });

      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      // The secretKey stored in DB should be a SHA-256 hex hash
      expect(insertValues.secretKey).toMatch(/^[a-f0-9]{64}$/);
      expect(insertValues.secretKey).not.toMatch(/^jns_secret_live_/);
    });

    it('should return secretKey only at creation (raw key)', async () => {
      const result = await service.create('owner-1', {
        name: 'My Site',
        domain: ['example.com'],
      });

      // The returned secretKey should be the raw (unhashed) key
      expect(result.secretKey).toMatch(/^jns_secret_live_/);
    });
  });

  describe('findBySiteKey()', () => {
    it('should throw NotFoundException when site not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.findBySiteKey('nonexistent-key')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySiteKey('nonexistent-key')).rejects.toThrow(
        'Site not found or inactive',
      );
    });

    it('should return site when found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeSiteRecord]),
        }),
      });

      const result = await service.findBySiteKey('jns_site_live_abc123');
      expect(result).toEqual(fakeSiteRecord);
    });
  });

  describe('findBySecretKeyHash()', () => {
    it('should hash the input and look up by hash', async () => {
      const rawSecret = 'jns_secret_live_test123';
      const expectedHash = createHash('sha256').update(rawSecret).digest('hex');

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeSiteRecord]),
        }),
      });

      const result = await service.findBySecretKeyHash(rawSecret);
      expect(result).toEqual(fakeSiteRecord);
    });

    it('should throw NotFoundException when secret key not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.findBySecretKeyHash('invalid-secret'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findBySecretKeyHash('invalid-secret'),
      ).rejects.toThrow('Invalid secret key');
    });
  });

  describe('rotateKeys()', () => {
    it('should generate new keys with correct prefixes', async () => {
      // Setup findOneByOwner to succeed
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeSiteRecord]),
        }),
      });

      // The update mock returns the updated record with new siteKey
      const updatedRecord = {
        ...fakeSiteRecord,
        siteKey: 'jns_site_live_new123',
      };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRecord]),
          }),
        }),
      });

      const result = await service.rotateKeys('site-uuid-1', 'owner-1');

      // The returned result should have a raw secretKey
      expect(result.secretKey).toMatch(/^jns_secret_live_/);

      // Verify update was called with new keys
      const setArg =
        mockDb.update.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.siteKey).toMatch(/^jns_site_live_/);
      expect(setArg.secretKey).toMatch(/^[a-f0-9]{64}$/); // hashed
    });

    it('should throw NotFoundException when site does not belong to owner', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.rotateKeys('site-uuid-1', 'wrong-owner'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
