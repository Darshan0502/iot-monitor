import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { IsPlainText, Trim, TrimToNull } from '../../common/text-rules';

// The serial is left out on purpose: devices already publish with it, so it cannot change after registration.
export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'Server room sensor', maxLength: 100 })
  @Trim()
  // A missing name is fine, but null is not: every device needs a name.
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsPlainText()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 100,
    example: 'Office, 2nd floor',
    description: 'Send null or an empty string to clear it',
  })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsPlainText()
  location?: string | null;
}
