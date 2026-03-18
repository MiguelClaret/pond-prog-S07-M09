import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { TelemetriaSensoresModule } from './telemetria_sensores/telemetria_sensores.module';

@Module({
  imports: [DatabaseModule, RabbitmqModule, TelemetriaSensoresModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
