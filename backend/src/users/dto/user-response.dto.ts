import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, Plan, Role, type User } from '@prisma/client';

/**
 * The public shape of a user. `providerId` is deliberately never exposed.
 * This is the single place a user is serialised, so the contract cannot drift
 * between `/auth/me` and `/users`.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ada@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/a/…', nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.google })
  authProvider!: AuthProvider;

  @ApiProperty({ enum: Role, example: Role.user })
  role!: Role;

  @ApiProperty({
    enum: Plan,
    example: Plan.free,
    description: 'Billing plan. The field exists; no billing logic is attached to it yet.',
  })
  plan!: Plan;

  @ApiProperty({ example: 128.4, description: 'Total size of this user’s stored files, in MB.' })
  storageUsedMB!: number;

  @ApiProperty({ example: 2048, description: 'Storage quota for this user, in MB.' })
  storageQuotaMB!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set when an admin has suspended this account. A suspended user cannot sign in.',
  })
  suspendedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(user: User, storageQuotaMB: number): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      role: user.role,
      plan: user.plan,
      storageUsedMB: Number(user.storageUsedMB.toFixed(3)),
      storageQuotaMB,
      suspendedAt: user.suspendedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
