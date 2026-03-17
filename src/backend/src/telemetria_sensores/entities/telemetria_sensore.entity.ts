export class TelemetriaSensore {
    id: string;
    horaColeta: Date;
    idDispositivo: number;
    tipoSensor: string;
    naturezaLeitura: string;
    valorColetado: string | null; 
    jobId: string | null; 
}