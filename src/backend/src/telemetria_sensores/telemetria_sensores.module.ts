import { Module } from '@nestjs/common';
import { TelemetriaSensoresService } from './telemetria_sensores.service';
import { TelemetriaSensoresController } from './telemetria_sensores.controller';

@Module({
  controllers: [TelemetriaSensoresController],
  providers: [TelemetriaSensoresService],
})
export class TelemetriaSensoresModule {}
