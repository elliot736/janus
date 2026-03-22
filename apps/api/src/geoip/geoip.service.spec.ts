import { GeoIpService } from './geoip.service';
import { ConfigService } from '@nestjs/config';

// Mock maxmind module
jest.mock('maxmind', () => ({
  open: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

import * as maxmind from 'maxmind';
import * as fs from 'fs';

describe('GeoIpService', () => {
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    jest.resetAllMocks();
    configService = {
      get: jest.fn().mockReturnValue('/test/geoip'),
    };
  });

  function createService(): GeoIpService {
    return new GeoIpService(configService as ConfigService);
  }

  describe('onModuleInit()', () => {
    it('should load databases when files exist', async () => {
      const mockCityReader = { get: jest.fn() };
      const mockAsnReader = { get: jest.fn() };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (maxmind.open as jest.Mock)
        .mockResolvedValueOnce(mockCityReader)
        .mockResolvedValueOnce(mockAsnReader);

      const service = createService();
      await service.onModuleInit();
      expect(service.isEnabled()).toBe(true);
    });

    it('should remain disabled when no database files exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const service = createService();
      await service.onModuleInit();
      expect(service.isEnabled()).toBe(false);
    });

    it('should handle errors during loading gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (maxmind.open as jest.Mock).mockRejectedValue(new Error('corrupt file'));

      const service = createService();
      await service.onModuleInit();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('lookup()', () => {
    it('should return empty result when disabled', () => {
      const service = createService();
      const result = service.lookup('1.2.3.4');
      expect(result).toEqual({
        countryCode: null,
        isDatacenter: false,
        isVpn: false,
        isProxy: false,
        asn: null,
        asnOrg: null,
      });
    });

    it('should return country code from city reader', async () => {
      const mockCityReader = {
        get: jest.fn().mockReturnValue({
          country: { iso_code: 'DE' },
        }),
      };

      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)   // city DB
        .mockReturnValueOnce(false); // no ASN DB
      (maxmind.open as jest.Mock).mockResolvedValueOnce(mockCityReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('1.2.3.4');
      expect(result.countryCode).toBe('DE');
    });

    it('should detect datacenter IPs by ASN organization', async () => {
      const mockCityReader = {
        get: jest.fn().mockReturnValue({
          country: { iso_code: 'US' },
        }),
      };
      const mockAsnReader = {
        get: jest.fn().mockReturnValue({
          autonomous_system_number: 16509,
          autonomous_system_organization: 'AMAZON-02',
        }),
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (maxmind.open as jest.Mock)
        .mockResolvedValueOnce(mockCityReader)
        .mockResolvedValueOnce(mockAsnReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('52.94.76.1');
      expect(result.isDatacenter).toBe(true);
      expect(result.asn).toBe(16509);
      expect(result.asnOrg).toBe('AMAZON-02');
    });

    it('should detect VPN from city traits', async () => {
      const mockCityReader = {
        get: jest.fn().mockReturnValue({
          country: { iso_code: 'NL' },
          traits: { is_anonymous_vpn: true },
        }),
      };

      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (maxmind.open as jest.Mock).mockResolvedValueOnce(mockCityReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('1.2.3.4');
      expect(result.isVpn).toBe(true);
      expect(result.countryCode).toBe('NL');
    });

    it('should detect proxy from city traits', async () => {
      const mockCityReader = {
        get: jest.fn().mockReturnValue({
          country: { iso_code: 'US' },
          traits: { is_anonymous_proxy: true },
        }),
      };

      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (maxmind.open as jest.Mock).mockResolvedValueOnce(mockCityReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('1.2.3.4');
      expect(result.isProxy).toBe(true);
    });

    it('should not flag non-datacenter ASNs', async () => {
      const mockCityReader = {
        get: jest.fn().mockReturnValue({
          country: { iso_code: 'US' },
        }),
      };
      const mockAsnReader = {
        get: jest.fn().mockReturnValue({
          autonomous_system_number: 7922,
          autonomous_system_organization: 'COMCAST-7922',
        }),
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (maxmind.open as jest.Mock)
        .mockResolvedValueOnce(mockCityReader)
        .mockResolvedValueOnce(mockAsnReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('1.2.3.4');
      expect(result.isDatacenter).toBe(false);
      expect(result.asnOrg).toBe('COMCAST-7922');
    });

    it('should handle lookup errors gracefully', async () => {
      const mockCityReader = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('invalid IP');
        }),
      };

      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (maxmind.open as jest.Mock).mockResolvedValueOnce(mockCityReader);

      const service = createService();
      await service.onModuleInit();

      const result = service.lookup('invalid');
      expect(result.countryCode).toBeNull();
      expect(result.isDatacenter).toBe(false);
    });
  });
});
