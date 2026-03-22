import { Injectable } from '@nestjs/common';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria-sensore.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TelemetriaProcessorService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async process(payload: QueueTelemetriaSensoreDto): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO telemetria_sensores
      (idDispositivo, horaColeta, tipoSensor, naturezaLeitura, valorColetado, jobId)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        payload.idDispositivo,
        payload.horaColeta,
        payload.tipoSensor,
        payload.naturezaLeitura,
        payload.valorColetado,
        payload.jobId,
      ],
    );

  }
}
