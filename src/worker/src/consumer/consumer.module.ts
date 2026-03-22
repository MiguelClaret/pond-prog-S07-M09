import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { TelemetriaProcessorService } from './telemetria-processor.service';

@Module({
  providers: [ConsumerService, TelemetriaProcessorService],
})
export class ConsumerModule {}
