import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Channel,
  ChannelModel,
  ConsumeMessage,
  Options,
  Replies,
  connect,
} from 'amqplib';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria-sensore.dto';
import { TelemetriaProcessorService } from './telemetria-processor.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly url =
    process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672/';
  private readonly queueName = 'telemetria_sensores';

  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(
    private readonly telemetriaProcessorService: TelemetriaProcessorService,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.startConsuming();
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private async startConsuming() {
    const channel = await this.getChannel();

    await this.assertQueue(this.queueName, { durable: true });
    await channel.prefetch(1);

    await channel.consume(
      this.queueName,
      (message) => void this.consumeMessage(channel, message),
      { noAck: false },
    );
  }

  private async consumeMessage(
    channel: Channel,
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (!message) {
      return;
    }

    let payload: QueueTelemetriaSensoreDto;

    try {
      payload = this.deserializePayload(message);
    } catch (error) {
      const errorDetails = this.getErrorMessage(
        error,
        'Payload invalido recebido pelo worker',
      );
      const jobId = this.extractJobIdFromMessage(message);

      if (jobId) {
        await this.databaseService.query(
          `
          UPDATE job_status_logs
          SET status = $1, error_details = $2, updated_at = NOW()
          WHERE id = $3
          `,
          ['falhou', errorDetails, jobId],
        );
      }

      channel.nack(message, false, false);
      return;
    }

    try {
      await this.databaseService.query(
        `
        UPDATE job_status_logs
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        ['processando', payload.jobId],
      );
      await this.handleTelemetryMessage(payload);
      channel.ack(message);

      await this.databaseService.query(
        `
        UPDATE job_status_logs
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        ['concluido', payload.jobId],
      );
    } catch (error) {
      const errorDetails = this.getErrorMessage(
        error,
        'Falha ao processar a telemetria',
      );

      channel.nack(message, false, true);
      await this.databaseService.query(
        `
        UPDATE job_status_logs
        SET status = $1, error_details = $2, updated_at = NOW()
        WHERE id = $3
        `,
        ['reprocessando', errorDetails, payload.jobId],
      );
    }
  }

  private deserializePayload(
    message: ConsumeMessage,
  ): QueueTelemetriaSensoreDto {
    const parsedPayload: unknown = JSON.parse(message.content.toString());

    if (!this.isQueueTelemetriaSensoreDto(parsedPayload)) {
      throw new Error('Formato da telemetria diferente do esperado');
    }

    return parsedPayload;
  }

  private extractJobIdFromMessage(message: ConsumeMessage): string | null {
    try {
      const parsedPayload: unknown = JSON.parse(message.content.toString());

      if (typeof parsedPayload !== 'object' || parsedPayload === null) {
        return null;
      }

      const data = parsedPayload as Record<string, unknown>;
      return typeof data.jobId === 'string' ? data.jobId : null;
    } catch {
      return null;
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private isQueueTelemetriaSensoreDto(
    payload: unknown,
  ): payload is QueueTelemetriaSensoreDto {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const data = payload as Record<string, unknown>;

    return (
      typeof data.idDispositivo === "number" &&
      typeof data.tipoSensor === 'string' &&
      typeof data.naturezaLeitura === 'string' &&
      (typeof data.valorColetado === 'string' || data.valorColetado === null) &&
      typeof data.jobId === 'string' &&
      typeof data.horaColeta === 'string'
    );
  }

  private async handleTelemetryMessage(
    payload: QueueTelemetriaSensoreDto,
  ): Promise<void> {
    await this.telemetriaProcessorService.process(payload);
  }

  private async assertQueue(
    queueName: string,
    options: Options.AssertQueue = { durable: true },
  ): Promise<Replies.AssertQueue> {
    const channel = await this.getChannel();
    return channel.assertQueue(queueName, options);
  }

  private async connect() {
    if (this.connection && this.channel) {
      return;
    }

    this.connection = await connect(this.url);
    this.channel = await this.connection.createChannel();

    this.connection.on('error', () => {});

    this.connection.on('close', () => {
      this.connection = null;
      this.channel = null;
    });
  }

  private async getChannel(): Promise<Channel> {
    if (!this.connection || !this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Canal RabbitMQ nao inicializado');
    }

    return this.channel;
  }
}
