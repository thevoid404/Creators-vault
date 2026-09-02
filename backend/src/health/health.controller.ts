import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and dependency check.' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        uptimeSeconds: 42,
        database: 'up',
        pgvector: 'installed',
        timestamp: '2026-09-02T10:00:00.000Z',
      },
    },
  })
  async check() {
    let database: 'up' | 'down' = 'down';
    let pgvector: 'installed' | 'missing' | 'unknown' = 'unknown';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
      pgvector = (await this.prisma.hasVectorExtension()) ? 'installed' : 'missing';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      database,
      pgvector,
      timestamp: new Date().toISOString(),
    };
  }
}
