import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { MqttService } from '../mqtt/mqtt.service';
import { PrismaService } from '../prisma/prisma.service';

const DATABASE_CHECK_TIMEOUT_MS = 2000;

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'The API and the database are up' })
  @ApiServiceUnavailableResponse({ description: 'The database cannot be reached' })
  async check() {
    const database = (await this.databaseIsUp()) ? ('up' as const) : ('down' as const);
    const result = {
      status: database === 'up' ? 'ok' : 'error',
      database,
      // Shown but not fatal: the REST API keeps working while the broker is down.
      mqtt: this.mqtt.isConnected() ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    // A 503 lets Docker or a load balancer see that the API cannot serve requests right now.
    if (database === 'down') throw new ServiceUnavailableException(result);
    return result;
  }

  // A database that accepts the connection but never answers would otherwise hang this request forever.
  private async databaseIsUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database check timed out')), DATABASE_CHECK_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
