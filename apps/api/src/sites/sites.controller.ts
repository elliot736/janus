import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Controller('api/v1/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Session() session: { user: { id: string } },
    @Body() createSiteDto: CreateSiteDto,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.sitesService.create(session.user.id, createSiteDto);
  }

  @Get()
  async findAll(@Session() session: { user: { id: string } }) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.sitesService.findAllByOwner(session.user.id);
  }

  @Get(':id')
  async findOne(
    @Session() session: { user: { id: string } },
    @Param('id') id: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.sitesService.findOneByOwner(id, session.user.id);
  }

  @Put(':id')
  async update(
    @Session() session: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateSiteDto: UpdateSiteDto,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.sitesService.update(id, session.user.id, updateSiteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Session() session: { user: { id: string } },
    @Param('id') id: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.sitesService.remove(id, session.user.id);
  }

  @Post(':id/rotate-keys')
  @HttpCode(HttpStatus.OK)
  async rotateKeys(
    @Session() session: { user: { id: string } },
    @Param('id') id: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.sitesService.rotateKeys(id, session.user.id);
  }
}
