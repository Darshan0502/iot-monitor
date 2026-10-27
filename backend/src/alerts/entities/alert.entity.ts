import { ApiProperty } from '@nestjs/swagger';
import { Alert, AlertType } from '@prisma/client';

class AlertDeviceEntity {
  @ApiProperty({ example: 'sensor-01' })
  serial: string;

  @ApiProperty({ example: 'Server room sensor' })
  name: string;
}

// An alert as the API returns it, for the Swagger docs.
export class AlertEntity implements Alert {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  deviceId: string;

  @ApiProperty({ enum: AlertType, enumName: 'AlertType' })
  type: AlertType;

  @ApiProperty({ type: Number, nullable: true, example: 9.2, description: 'The reading that opened the alert' })
  value: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 8, description: 'The limit that reading crossed' })
  threshold: number | null;

  @ApiProperty({ example: 'Temperature 9.2 °C is above the maximum of 8 °C' })
  message: string;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty({ type: Date, nullable: true, description: 'Null while the alert is open' })
  resolvedAt: Date | null;

  @ApiProperty({ type: AlertDeviceEntity })
  device: AlertDeviceEntity;
}
