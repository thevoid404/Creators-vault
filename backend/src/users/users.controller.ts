import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto, UpdateUserAdminDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'The authenticated user’s profile.' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.users.toResponse(await this.users.findById(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user’s own profile.' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.users.toResponse(await this.users.updateProfile(user.id, dto));
  }

  @Get()
  @Roles(Role.admin)
  @ApiOperation({
    summary: 'List all users. Admin only.',
    description:
      'Paginated. `q` matches email and name. Sortable by createdAt, email, name, storageUsedMB.',
  })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiForbiddenResponse({ description: 'Caller is not an admin.' })
  async list(@Query() query: ListUsersQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Fetch one user.',
    description: 'A non-admin may only read their own record.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'No such user.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    if (caller.role !== Role.admin && caller.id !== id) {
      throw new ForbiddenException('You may only read your own profile.');
    }
    return this.users.toResponse(await this.users.findById(id));
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({
    summary: 'Change a user’s role or plan. Admin only.',
    description:
      'Kept separate from PATCH /users/me so that a user can never escalate their own role.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async updateAsAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAdminDto,
  ): Promise<UserResponseDto> {
    return this.users.toResponse(await this.users.updateAsAdmin(id, dto));
  }
}
