import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsPlainText, Trim, TrimToNull } from '../../common/text-rules';

export class CreateDeviceDto {
  // The serial becomes part of an MQTT topic, so it must not contain "/", "+" or "#".
  @ApiProperty({ example: 'sensor-01', description: 'Unique code the device uses in its MQTT topic' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,62}$/, {
    message: 'serial must be 2-63 characters: lowercase letters, digits and dashes, starting with a letter or digit',
  })
  serial: string;

  @ApiProperty({ example: 'Server room sensor', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsPlainText()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100, example: 'Office, 2nd floor' })
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsPlainText()
  location?: string | null;
}
