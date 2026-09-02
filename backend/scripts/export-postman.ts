/**
 * Generates a Postman collection from the live OpenAPI document.
 *
 *   npm run postman:export
 *
 * It boots the Nest application in memory (never listening on a port), asks
 * Swagger for the document every route and DTO already produces, and converts
 * it. Generating from the app rather than hand-writing a collection is what
 * keeps it correct: a route added later appears here without anyone remembering
 * to update it.
 *
 * No database is required — PrismaService logs a failed connection rather than
 * throwing, precisely so documentation can be generated offline.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { applyApiPrefix } from '../src/api-prefix';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/swagger';

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string; type?: string }>;
    url: { raw: string; host: string[]; path: string[]; query?: Array<Record<string, unknown>> };
    body?: { mode: 'raw' | 'formdata'; raw?: string; options?: unknown; formdata?: unknown[] };
    description?: string;
    auth?: unknown;
  };
  response: unknown[];
}

interface PostmanFolder {
  name: string;
  description?: string;
  item: PostmanItem[];
}

type SchemaObject = Record<string, unknown>;

/** Builds a representative request body from a JSON schema. */
function exampleFromSchema(
  schema: SchemaObject | undefined,
  spec: OpenAPIObject,
  depth = 0,
): unknown {
  if (!schema || depth > 6) {
    return null;
  }

  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').pop() as string;
    const resolved = (spec.components?.schemas ?? {})[name] as SchemaObject | undefined;
    return exampleFromSchema(resolved, spec, depth + 1);
  }
  if (Array.isArray(schema.allOf)) {
    return Object.assign(
      {},
      ...schema.allOf.map((part) => exampleFromSchema(part as SchemaObject, spec, depth + 1)),
    );
  }
  if (schema.example !== undefined) {
    return schema.example;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  switch (schema.type) {
    case 'array':
      return [exampleFromSchema(schema.items as SchemaObject, spec, depth + 1)].filter(
        (value) => value !== null,
      );
    case 'object': {
      const properties = (schema.properties ?? {}) as Record<string, SchemaObject>;
      const output: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(properties)) {
        if (value.readOnly) {
          continue;
        }
        output[key] = exampleFromSchema(value, spec, depth + 1);
      }
      return output;
    }
    case 'integer':
    case 'number':
      return schema.default ?? 0;
    case 'boolean':
      return schema.default ?? false;
    case 'string':
      if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'binary') return '';
      return schema.default ?? '';
    default:
      return null;
  }
}

function toPostman(spec: OpenAPIObject): Record<string, unknown> {
  const folders = new Map<string, PostmanFolder>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, rawOperation] of Object.entries(pathItem as Record<string, unknown>)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        continue;
      }
      const operation = rawOperation as Record<string, unknown>;
      const tag = ((operation.tags as string[]) ?? ['default'])[0];

      if (!folders.has(tag)) {
        const described = spec.tags?.find((entry) => entry.name === tag);
        folders.set(tag, { name: tag, description: described?.description, item: [] });
      }

      // `{{baseUrl}}` already carries the /api/v1 prefix, so it is stripped here
      // rather than duplicated. OpenAPI writes path params as {id}; Postman uses
      // :id, which is what makes them editable path variables in the UI.
      const postmanPath = path
        .replace(/^\/api\/v1\//, '')
        .replace(/^\//, '')
        .replace(/\{([^}]+)\}/g, ':$1');

      const parameters = (operation.parameters ?? []) as Array<Record<string, unknown>>;
      const query = parameters
        .filter((parameter) => parameter.in === 'query')
        .map((parameter) => ({
          key: parameter.name as string,
          value: String(
            (parameter.schema as SchemaObject | undefined)?.default ??
              (parameter.example as string) ??
              '',
          ),
          description: parameter.description as string | undefined,
          // Optional params are present but disabled, so the request works
          // as-is and every filter is still discoverable in the UI.
          disabled: parameter.required !== true,
        }));

      const header: PostmanItem['request']['header'] = [];
      const security = (operation.security ?? []) as Array<Record<string, unknown>>;
      const usesExtensionToken = security.some((entry) => 'extension-token' in entry);
      if (usesExtensionToken) {
        header.push({ key: 'X-Extension-Token', value: '{{extensionToken}}', type: 'text' });
      }

      let body: PostmanItem['request']['body'];
      const content = (operation.requestBody as Record<string, unknown> | undefined)?.[
        'content'
      ] as Record<string, { schema?: SchemaObject }> | undefined;

      if (content?.['application/json']) {
        header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
        body = {
          mode: 'raw',
          raw: JSON.stringify(exampleFromSchema(content['application/json'].schema, spec), null, 2),
          options: { raw: { language: 'json' } },
        };
      } else if (content?.['multipart/form-data']) {
        const properties = (content['multipart/form-data'].schema?.properties ?? {}) as Record<
          string,
          SchemaObject
        >;
        body = {
          mode: 'formdata',
          formdata: Object.entries(properties).map(([key, value]) => ({
            key,
            type: value.format === 'binary' || value.type === 'array' ? 'file' : 'text',
            value: value.format === 'binary' ? undefined : String(value.default ?? ''),
            description: value.description,
            src: [],
          })),
        };
      }

      folders.get(tag)!.item.push({
        name: (operation.summary as string) ?? `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header,
          url: {
            raw: `{{baseUrl}}/${postmanPath}${query.length ? '?' : ''}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.split('/').filter(Boolean),
            ...(query.length ? { query } : {}),
          },
          ...(body ? { body } : {}),
          description: operation.description as string | undefined,
          // Extension-token routes authenticate by header, so they opt out of
          // the collection-level bearer auth rather than sending both.
          ...(usesExtensionToken ? { auth: { type: 'noauth' } } : {}),
        },
        response: [],
      });
    }
  }

  return {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    // Collection-level bearer auth: sign in once, set the variable, and every
    // authenticated request inherits it.
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000/api/v1', type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
      { key: 'refreshToken', value: '', type: 'string' },
      { key: 'extensionToken', value: '', type: 'string' },
    ],
    item: [...folders.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function main(): Promise<void> {
  const logger = new Logger('PostmanExport');
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  applyApiPrefix(app);

  try {
    const spec = buildOpenApiDocument(app);

    const openApiPath = resolve(process.cwd(), 'docs/openapi.json');
    const postmanPath = resolve(process.cwd(), 'docs/creators-vault.postman_collection.json');
    mkdirSync(dirname(openApiPath), { recursive: true });

    writeFileSync(openApiPath, JSON.stringify(spec, null, 2));
    writeFileSync(postmanPath, JSON.stringify(toPostman(spec), null, 2));

    const operations = Object.values(spec.paths ?? {}).reduce(
      (count, pathItem) =>
        count +
        Object.keys(pathItem as object).filter((key) =>
          ['get', 'post', 'put', 'patch', 'delete'].includes(key),
        ).length,
      0,
    );

    logger.log(`Wrote docs/openapi.json (${operations} operations)`);
    logger.log('Wrote docs/creators-vault.postman_collection.json');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
