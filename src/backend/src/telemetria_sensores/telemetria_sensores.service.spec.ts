import { Test, TestingModule } from '@nestjs/testing';
import { TelemetriaSensoresService } from './telemetria_sensores.service';

describe('TelemetriaSensoresService', () => {
  let service: TelemetriaSensoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetriaSensoresService],
    }).compile();

    service = module.get<TelemetriaSensoresService>(TelemetriaSensoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
