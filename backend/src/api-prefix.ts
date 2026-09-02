import { VersioningType, type INestApplication } from '@nestjs/common';

/**
 * Puts every route under `/api/v1/...`.
 *
 * Shared by `main.ts` and by the OpenAPI/Postman exporter so the two cannot
 * drift — an exporter that configured its own prefix would silently publish
 * documentation with the wrong paths.
 */
export function applyApiPrefix(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
