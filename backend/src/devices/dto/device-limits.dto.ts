import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min, ValidateBy, ValidationArguments } from 'class-validator';

/** Checks that this value is lower than another field of the same body, when both are set. */
function IsLowerThan(property: string) {
  return ValidateBy({
    name: 'isLowerThan',
    constraints: [property],
    validator: {
      validate: (value: unknown, args?: ValidationArguments) => {
        const other = (args?.object as Record<string, unknown>)[property];
        return typeof value !== 'number' || typeof other !== 'number' || value < other;
      },
      defaultMessage: (args?: ValidationArguments) => `${args?.property} must be lower than ${property}`,
    },
  });
}

/**
 * The alert limits of a device. PUT replaces all four at once, so a missing or null value means "no limit".
 * The ranges are the same as for readings: a limit outside them could never be crossed.
 */
export class DeviceLimitsDto {
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -40, maximum: 125, example: 2 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-40)
  @Max(125)
  @IsLowerThan('temperatureMax')
  temperatureMin?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -40, maximum: 125, example: 8 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-40)
  @Max(125)
  temperatureMax?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 100, example: 80 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  @IsLowerThan('humidityMax')
  humidityMin?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 100, example: 98 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  humidityMax?: number | null;
}
