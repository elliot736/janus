import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as maxmind from 'maxmind';
import type { CityResponse, AsnResponse } from 'maxmind';
import * as path from 'path';
import * as fs from 'fs';

export interface GeoIpResult {
  countryCode: string | null;
  isDatacenter: boolean;
  isVpn: boolean;
  isProxy: boolean;
  asn: number | null;
  asnOrg: string | null;
}

/** Well-known datacenter/hosting ASN organizations (partial list). */
const DATACENTER_ORG_PATTERNS = [
  'amazon',
  'aws',
  'google cloud',
  'google llc',
  'microsoft',
  'azure',
  'digitalocean',
  'linode',
  'akamai',
  'vultr',
  'ovh',
  'hetzner',
  'choopa',
  'contabo',
  'scaleway',
  'oracle cloud',
  'cloudflare',
  'fastly',
  'heroku',
  'rackspace',
  'leaseweb',
];

@Injectable()
export class GeoIpService implements OnModuleInit {
  private readonly logger = new Logger(GeoIpService.name);
  private cityReader: maxmind.Reader<CityResponse> | null = null;
  private asnReader: maxmind.Reader<AsnResponse> | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const dbDir =
      this.configService.get<string>('GEOIP_DB_PATH') ||
      path.join(process.cwd(), 'data', 'geoip');

    const cityPath = path.join(dbDir, 'GeoLite2-City.mmdb');
    const asnPath = path.join(dbDir, 'GeoLite2-ASN.mmdb');

    try {
      if (fs.existsSync(cityPath)) {
        this.cityReader = await maxmind.open<CityResponse>(cityPath);
        this.logger.log('GeoLite2-City database loaded');
      } else {
        this.logger.warn(
          `GeoLite2-City database not found at ${cityPath} — country detection disabled`,
        );
      }

      if (fs.existsSync(asnPath)) {
        this.asnReader = await maxmind.open<AsnResponse>(asnPath);
        this.logger.log('GeoLite2-ASN database loaded');
      } else {
        this.logger.warn(
          `GeoLite2-ASN database not found at ${asnPath} — ASN detection disabled`,
        );
      }

      this.enabled = this.cityReader !== null || this.asnReader !== null;

      if (!this.enabled) {
        this.logger.warn(
          'No GeoIP databases found — geo-based risk signals disabled. ' +
            'Download GeoLite2 databases from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data',
        );
      }
    } catch (err) {
      this.logger.error('Failed to load GeoIP databases', err);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resolve an IP address to geo and network information.
   * The IP is used only for the in-memory lookup and is never stored or logged.
   * Only the country code and network type flags are returned.
   */
  lookup(ip: string): GeoIpResult {
    const result: GeoIpResult = {
      countryCode: null,
      isDatacenter: false,
      isVpn: false,
      isProxy: false,
      asn: null,
      asnOrg: null,
    };

    if (!this.enabled) return result;

    try {
      if (this.cityReader) {
        const city = this.cityReader.get(ip);
        if (city) {
          result.countryCode = city.country?.iso_code ?? null;

          // MaxMind traits for proxy/VPN detection (available in City DB)
          const traits = city.traits as Record<string, unknown> | undefined;
          if (traits) {
            result.isProxy = Boolean(traits.is_anonymous_proxy);
            result.isVpn =
              Boolean(traits.is_anonymous_vpn) ||
              Boolean(traits.is_anonymous);
          }
        }
      }

      if (this.asnReader) {
        const asn = this.asnReader.get(ip);
        if (asn) {
          result.asn = asn.autonomous_system_number ?? null;
          result.asnOrg = asn.autonomous_system_organization ?? null;

          // Check if ASN org matches known datacenter providers
          if (result.asnOrg) {
            const orgLower = result.asnOrg.toLowerCase();
            result.isDatacenter = DATACENTER_ORG_PATTERNS.some((pattern) =>
              orgLower.includes(pattern),
            );
          }
        }
      }
    } catch (err) {
      this.logger.debug(`GeoIP lookup failed for IP: ${(err as Error).message}`);
    }

    return result;
  }
}
