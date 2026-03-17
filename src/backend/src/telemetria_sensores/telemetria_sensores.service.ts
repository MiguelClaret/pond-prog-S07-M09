import { Injectable } from '@nestjs/common';
import { CreateTelemetriaSensoreDto } from './dto/create-telemetria_sensore.dto';
import { DatabaseService } from 'src/database/database.service';
import { randomUUID } from 'crypto';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria_sensore.dt';

@Injectable()
export class TelemetriaSensoresService {
  constructor(private readonly db: DatabaseService) {}

  async create(createTelemetriaSensoreDto: CreateTelemetriaSensoreDto) {

    // gerar jobId
    const jobId = randomUUID();
    
    const payload: QueueTelemetriaSensoreDto = {
      ...createTelemetriaSensoreDto,
      horaColeta: new Date(),
      jobId
    };


    const log = await this.db.query(
      `
      INSERT INTO job_status_logs (
        job_id,
        queue_name,
        status,
        payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
      [jobId, 'jobs', 'em_fila', payload],
    );

    // publicar a msg no rabbit

    // se falhar o envio logar isso

    // se não enviar 202


    
    return log;
  }
}
