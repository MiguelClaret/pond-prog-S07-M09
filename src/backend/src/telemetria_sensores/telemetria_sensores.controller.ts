import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetriaSensoresService } from './telemetria_sensores.service';
import { CreateTelemetriaSensoreDto } from './dto/create-telemetria_sensore.dto';

@Controller('telemetria-sensores')
export class TelemetriaSensoresController {
  constructor(private readonly telemetriaSensoresService: TelemetriaSensoresService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() createTelemetriaSensoreDto: CreateTelemetriaSensoreDto) {
    return await this.telemetriaSensoresService.create(createTelemetriaSensoreDto);
  }
}
