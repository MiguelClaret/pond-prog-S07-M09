export class QueueTelemetriaSensoreDto {
  idDispositivo: number;
  tipoSensor: string;
  naturezaLeitura: string;
  valorColetado: string | null;
  jobId: string;
  horaColeta: string;
}
