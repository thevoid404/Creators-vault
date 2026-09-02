import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, Plan, Role } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const USER_SORT_FIELDS = ['createdAt', 'email', 'name', 'storageUsedMB'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: USER_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortBy: UserSortField = 'createdAt';

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: Plan })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({ enum: AuthProvider })
  @IsOptional()
  @IsEnum(AuthProvider)
  authProvider?: AuthProvider;
}
