import { ApiProperty } from '@nestjs/swagger';

// A reading as the API returns it, for the Swagger docs.
export class ReadingEntity {
  @ApiProperty()
  recordedAt: Date;

  @ApiProperty({ type: Number, nullable: true, example: 23.5 })
  temperature: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 41 })
  humidity: number | null;
}
