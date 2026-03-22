import { Test, TestingModule } from '@nestjs/testing';
import { ConsumeMessage } from 'amqplib';
import { ConsumerService } from './consumer.service';
import { TelemetriaProcessorService } from './telemetria-processor.service';
import { DatabaseService } from '../database/database.service';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria-sensore.dto';

describe('ConsumerService', () => {
  let service: ConsumerService;
  let telemetriaProcessorService: { process: jest.Mock };
  let databaseService: { query: jest.Mock };

  const payload: QueueTelemetriaSensoreDto = {
    idDispositivo: 1,
    tipoSensor: 'temperatura',
    naturezaLeitura: 'celsius',
    valorColetado: '23.5',
    jobId: 'job-123',
    horaColeta: '2026-03-21T12:00:00.000Z',
  };

  beforeEach(async () => {
    telemetriaProcessorService = { process: jest.fn() };
    databaseService = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerService,
        {
          provide: TelemetriaProcessorService,
          useValue: telemetriaProcessorService,
        },
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile();

    service = module.get<ConsumerService>(ConsumerService);
  });

  function createMessage(body: unknown): ConsumeMessage {
    return {
      content: Buffer.from(JSON.stringify(body)),
    } as ConsumeMessage;
  }

  function createChannel() {
    return {
      ack: jest.fn(),
      nack: jest.fn(),
    };
  }

  it('processa a mensagem, atualiza status e confirma com ack', async () => {
    const channel = createChannel();
    const message = createMessage(payload);

    databaseService.query.mockResolvedValue({});
    telemetriaProcessorService.process.mockResolvedValue(undefined);

    await (service as any).consumeMessage(channel, message);

    expect(databaseService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $2'),
      ['processando', payload.jobId],
    );
    expect(telemetriaProcessorService.process).toHaveBeenCalledWith(payload);
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(databaseService.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE id = $2'),
      ['concluido', payload.jobId],
    );
  });

  it('descarta payload invalido com nack sem reenfileirar', async () => {
    const channel = createChannel();
    const message = createMessage({ foo: 'bar' });

    await (service as any).consumeMessage(channel, message);

    expect(telemetriaProcessorService.process).not.toHaveBeenCalled();
    expect(databaseService.query).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('marca como falhou quando o payload e invalido mas possui jobId', async () => {
    const channel = createChannel();
    const message = createMessage({ jobId: payload.jobId, foo: 'bar' });

    databaseService.query.mockResolvedValue({});

    await (service as any).consumeMessage(channel, message);

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining('error_details = $2'),
      [
        'falhou',
        'Formato da telemetria diferente do esperado',
        payload.jobId,
      ],
    );
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('marca para reprocessamento quando o processor falha', async () => {
    const channel = createChannel();
    const message = createMessage(payload);

    databaseService.query.mockResolvedValue({});
    telemetriaProcessorService.process.mockRejectedValue(
      new Error('falha de processamento'),
    );

    await (service as any).consumeMessage(channel, message);

    expect(databaseService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $2'),
      ['processando', payload.jobId],
    );
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
    expect(databaseService.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('error_details = $2'),
      ['reprocessando', 'falha de processamento', payload.jobId],
    );
  });
});
