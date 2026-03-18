import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Channel,
  ChannelModel,
  Options,
  Replies,
  connect,
} from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private readonly url =
    process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672/';

  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async onModuleInit() {
    await this.connect();
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

  async assertQueue(
    queueName: string,
    options: Options.AssertQueue = { durable: true },
  ): Promise<Replies.AssertQueue> {
    const channel = await this.getChannel();
    return channel.assertQueue(queueName, options);
  }

  async publish(
    queueName: string,
    payload: unknown,
    options: Options.Publish = {},
  ): Promise<boolean> {
    const channel = await this.getChannel();

    await this.assertQueue(queueName, { durable: true });

    const sent = channel.sendToQueue(this.normalizeQueueName(queueName), this.serializePayload(payload), {
      persistent: true,
      contentType: 'application/json',
      ...options,
    });

    if (!sent) {
      this.logger.warn(`RabbitMQ sinalizou backpressure ao publicar na fila ${queueName}`);
    }

    return sent;
  }

  private async connect() {
    if (this.connection && this.channel) {
      return;
    }

    this.connection = await connect(this.url);
    this.channel = await this.connection.createChannel();

    this.connection.on('error', (error) => {
      this.logger.error('Erro na conexao com o RabbitMQ', error.stack);
    });

    this.connection.on('close', () => {
      this.logger.warn('Conexao com RabbitMQ encerrada');
      this.connection = null;
      this.channel = null;
    });

    this.logger.log(`Conexao com RabbitMQ estabelecida em ${this.url}`);
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

  private normalizeQueueName(queueName: string): string {
    const normalized = queueName.trim();

    if (!normalized) {
      throw new Error('queueName nao pode ser vazio');
    }

    return normalized;
  }

  private serializePayload(payload: unknown): Buffer {
    if (Buffer.isBuffer(payload)) {
      return payload;
    }

    if (typeof payload === 'string') {
      return Buffer.from(payload);
    }

    return Buffer.from(JSON.stringify(payload));
  }
}
