import { Injectable } from '@nestjs/common';
import { CreateTelemetriaSensoreDto } from './dto/create-telemetria_sensore.dto';
import { DatabaseService } from 'src/database/database.service';
import { randomUUID } from 'crypto';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria_sensore.dt';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class TelemetriaSensoresService {
  constructor(
    private readonly db: DatabaseService, 
    private readonly rabbitmqService: RabbitmqService
  ) {}

  async create(createTelemetriaSensoreDto: CreateTelemetriaSensoreDto) {
    try {
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

    const fila = await this.rabbitmqService.publish('telemetria_sensores', payload);
    
    // se falhar o envio logar isso
    if(!fila) {
      await this.db.query(
        `
        UPDATE job_status_logs
        SET status = $1, updated_at = NOW()
        WHERE job_id = $2
        `,
        ['falha_envio', jobId],
      );
    }

    return {
      mensagem: 'Telemetria sensore recebida e processada',
      jobId,
    };
    } catch (error) {
      console.error('Erro ao criar telemetria sensore:', error);
      throw new Error('Erro ao criar telemetria sensore');
    }
  }
}
