import { Test, TestingModule } from '@nestjs/testing';
import { TelemetriaProcessorService } from './telemetria-processor.service';
import { DatabaseService } from '../database/database.service';
import { QueueTelemetriaSensoreDto } from './dto/queue-telemetria-sensore.dto';

describe('TelemetriaProcessorService', () => {
  let service: TelemetriaProcessorService;
  let databaseService: { query: jest.Mock };

  const payload: QueueTelemetriaSensoreDto = {
    idDispositivo: 7,
    tipoSensor: 'umidade',
    naturezaLeitura: 'percentual',
    valorColetado: '80',
    jobId: 'job-xyz',
    horaColeta: '2026-03-21T13:00:00.000Z',
  };

  beforeEach(async () => {
    databaseService = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetriaProcessorService,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile();

    service = module.get<TelemetriaProcessorService>(
      TelemetriaProcessorService,
    );
  });

  it('insere a telemetria no banco com os dados recebidos', async () => {
    databaseService.query.mockResolvedValue({});

    await service.process(payload);

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO telemetria_sensores'),
      [
        payload.idDispositivo,
        payload.horaColeta,
        payload.tipoSensor,
        payload.naturezaLeitura,
        payload.valorColetado,
        payload.jobId,
      ],
    );
  });
});
