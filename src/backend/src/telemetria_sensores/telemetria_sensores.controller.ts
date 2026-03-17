import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TelemetriaSensoresService } from './telemetria_sensores.service';
import { CreateTelemetriaSensoreDto } from './dto/create-telemetria_sensore.dto';

@Controller('telemetria-sensores')
export class TelemetriaSensoresController {
  constructor(private readonly telemetriaSensoresService: TelemetriaSensoresService) {}

  @Post()
  async create(@Body() createTelemetriaSensoreDto: CreateTelemetriaSensoreDto) {
    return await this.telemetriaSensoresService.create(createTelemetriaSensoreDto);
  }

}
