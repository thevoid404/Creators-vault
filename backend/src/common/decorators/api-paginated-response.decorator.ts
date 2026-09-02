import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto, PaginationMetaDto } from '../dto/paginated-response.dto';

/**
 * Documents a paginated list response.
 *
 * `@ApiOkResponse({ type: PaginatedResponseDto<Thing> })` does not work:
 * TypeScript generics are erased before the Swagger plugin sees them, so the
 * generated schema shows `data: []` with no item type and the frontend gets no
 * model to generate against. This composes the schema explicitly instead.
 */
export function ApiPaginatedResponse<T extends Type<unknown>>(model: T, description?: string) {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, PaginationMetaDto, model),
    ApiOkResponse({
      description: description ?? `Paginated list of ${model.name.replace(/Dto$/, '')}.`,
      schema: {
        allOf: [
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
              meta: { $ref: getSchemaPath(PaginationMetaDto) },
            },
            required: ['data', 'meta'],
          },
        ],
      },
    }),
  );
}
