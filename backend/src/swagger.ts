import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/**
 * Swagger is wired from Phase 0 so that every endpoint is documented as it is
 * written, rather than being retrofitted at the end. Phase 8 only finalises the
 * copy and exports the Postman collection from this same document.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("Creators' Vault API")
    .setDescription(
      [
        'Backend for Creators’ Vault — an intelligent digital asset management workspace.',
        '',
        'All routes are versioned under `/api/v1`.',
        '',
        '**Auth:** obtain a JWT by completing the Google OAuth flow at',
        '`GET /api/v1/auth/google`, then send it as `Authorization: Bearer <accessToken>`.',
        '',
        '**Stubbed modules:** marketplace and payments expose their final request and',
        'response shapes but do not process real transactions.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Extension-Token',
        in: 'header',
        description: 'Long-lived browser-extension token issued by POST /api/v1/extension/token.',
      },
      'extension-token',
    )
    .addTag('health', 'Liveness and dependency checks')
    .addTag('auth', 'OAuth login, JWT issuing and refresh')
    .addTag('users', 'User profiles and admin user management')
    .addTag('assets', 'Asset CRUD and every ingestion route')
    .addTag('projects', 'Projects and their sections')
    .addTag('tags', 'Tags and tag auto-suggest')
    .addTag('relationships', 'The asset relationship graph')
    .addTag('search', 'Keyword search, semantic search and similarity')
    .addTag('extension', 'Browser-extension tokens and the capture endpoint')
    .addTag('marketplace', 'Marketplace listings (STUB)')
    .addTag('payments', 'Payment sessions and transactions (STUB)')
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: "Creators' Vault API",
  });
}
