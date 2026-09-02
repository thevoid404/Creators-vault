import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  /**
   * A failed connection is logged, not thrown.
   *
   * Crashing on boot would make `GET /health` — whose whole job is to report
   * that the database is down — the one endpoint you cannot reach when it is.
   * It would also make the OpenAPI/Postman export require a live database to
   * generate documentation. Requests that need the database still fail loudly,
   * with the mapped Prisma error, and `/health` reports `degraded`.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL');
    } catch (error) {
      this.logger.error(
        `Could not connect to PostgreSQL: ${(error as Error).message}. ` +
          'The API is up but every database-backed route will fail. Check DATABASE_URL and that Postgres is running.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Close the Nest app cleanly when the Prisma process receives a shutdown signal. */
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', () => {
      void app.close();
    });
  }

  /**
   * True when the `vector` extension is installed. Semantic search and the
   * similarity endpoint check this so they can fall back to keyword search on a
   * database that was set up without pgvector, instead of throwing at query time.
   */
  async hasVectorExtension(): Promise<boolean> {
    try {
      const rows = await this.$queryRaw<Array<{ installed: boolean }>>`
        SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS installed
      `;
      return rows[0]?.installed === true;
    } catch {
      return false;
    }
  }
}
