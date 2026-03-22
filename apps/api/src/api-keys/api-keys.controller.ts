import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { ApiKeysService } from './api-keys.service';

@Controller('api/v1')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /** List all API keys for the current user (across all sites) */
  @Get('api-keys')
  async findAll(@Session() session: { user: { id: string } }) {
    if (!session?.user) throw new UnauthorizedException();
    return this.apiKeysService.findAllByUser(session.user.id);
  }

  /** List API keys for a specific site */
  @Get('sites/:siteId/api-keys')
  async findBySite(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
  ) {
    if (!session?.user) throw new UnauthorizedException();
    return this.apiKeysService.findBySite(siteId, session.user.id);
  }

  /** Create an API key for a specific site */
  @Post('sites/:siteId/api-keys')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Body() body: { label?: string },
  ) {
    if (!session?.user) throw new UnauthorizedException();
    if (!body.label?.trim()) throw new BadRequestException('Label is required');
    return this.apiKeysService.create(siteId, session.user.id, body.label.trim());
  }

  /** Delete an API key */
  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Session() session: { user: { id: string } },
    @Param('id') id: string,
  ) {
    if (!session?.user) throw new UnauthorizedException();
    await this.apiKeysService.remove(id, session.user.id);
  }
}
