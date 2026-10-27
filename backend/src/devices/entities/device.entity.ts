import { ApiProperty } from '@nestjs/swagger';
import { Device } from '@prisma/client';

// The device as the API returns it, for the Swagger docs. Implementing the Prisma type means
// a new column breaks the build until it is added here too.
export class DeviceEntity implements Device {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'sensor-01' })
  serial: string;

  @ApiProperty({ example: 'Server room sensor' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Office, 2nd floor' })
  location: string | null;

  @ApiProperty({ type: Date, nullable: true })
  lastSeenAt: Date | null;

  @ApiProperty({ type: Number, nullable: true, example: 2, description: 'Alert when the temperature drops below this (°C)' })
  temperatureMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 8, description: 'Alert when the temperature rises above this (°C)' })
  temperatureMax: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 80, description: 'Alert when the humidity drops below this (%)' })
  humidityMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 98, description: 'Alert when the humidity rises above this (%)' })
  humidityMax: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
