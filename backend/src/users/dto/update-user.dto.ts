import { ApiPropertyOptional } from '@nestjs/swagger';
import { Plan, Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

/** What a user may change about their own profile. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace', minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string;
}

/** Admin-only changes. Kept separate so a user can never escalate themselves. */
export class UpdateUserAdminDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    enum: Plan,
    description: 'Set manually for now. Billing does not drive this field yet.',
  })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
