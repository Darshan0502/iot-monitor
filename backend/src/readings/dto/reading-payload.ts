import { IsISO8601, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';

/**
 * The JSON a device publishes to devices/<serial>/readings, for example
 * {"temperature": 23.5, "humidity": 41, "timestamp": "2026-10-23T10:00:00Z"}.
 * The ranges match common temperature and humidity sensors; anything outside them is a broken sensor.
 */
export class ReadingPayload {
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-40)
  @Max(125)
  temperature?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  humidity?: number | null;

  // Without a time zone the same text means different moments on different machines.
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'timestamp must include a time zone, for example 2026-10-23T10:00:00Z' })
  timestamp?: string;
}
