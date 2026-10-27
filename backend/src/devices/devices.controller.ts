import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceLimitsDto } from './dto/device-limits.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceEntity } from './entities/device.entity';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @ApiCreatedResponse({ type: DeviceEntity })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'A device with this serial already exists' })
  create(@Body() dto: CreateDeviceDto) {
    return this.devices.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [DeviceEntity] })
  findAll() {
    return this.devices.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: DeviceEntity })
  @ApiNotFoundResponse({ description: 'Device not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.devices.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: DeviceEntity })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Device not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeviceDto) {
    return this.devices.update(id, dto);
  }

  @Put(':id/limits')
  @ApiOkResponse({ type: DeviceEntity })
  @ApiBadRequestResponse({ description: 'Invalid limits, for example a minimum above the maximum' })
  @ApiNotFoundResponse({ description: 'Device not found' })
  setLimits(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeviceLimitsDto) {
    return this.devices.setLimits(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Device deleted' })
  @ApiNotFoundResponse({ description: 'Device not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.devices.remove(id);
  }
}
