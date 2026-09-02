import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthTokensDto {
  @ApiProperty({ description: 'Send as `Authorization: Bearer <accessToken>`.' })
  accessToken!: string;

  @ApiProperty({ description: 'Present to POST /auth/refresh. Rotated on every use.' })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 900, description: 'Access-token lifetime, in seconds.' })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued by the login or the previous refresh.' })
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  refreshToken!: string;
}
