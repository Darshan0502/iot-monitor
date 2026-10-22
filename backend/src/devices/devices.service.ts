import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Device } from '@prisma/client';
import { isPrismaError, PrismaErrorCode } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeviceDto): Promise<Device> {
    try {
      return await this.prisma.device.create({ data: dto });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed)) {
        throw new ConflictException(`A device with serial "${dto.serial}" already exists`);
      }
      throw error;
    }
  }

  findAll(): Promise<Device[]> {
    // createdAt and id break ties, so devices with the same name keep a stable order.
    return this.prisma.device.findMany({ orderBy: [{ name: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw this.notFound(id);
    return device;
  }

  // Prisma's update() and delete() throw P2025 when the row does not exist, so a separate existence
  // check (which another request could make stale) is not needed.
  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    try {
      return await this.prisma.device.update({ where: { id }, data: dto });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) throw this.notFound(id);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.device.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) throw this.notFound(id);
      throw error;
    }
  }

  private notFound(id: string) {
    return new NotFoundException(`Device ${id} not found`);
  }
}
