
import Dexie, { type Table } from 'dexie';

export interface TemplateComponent {
  name: string;
  description: string;
  measurements: string; // e.g. "Nominal: 24VDC +/- 0.5V"
}

export interface AssetTemplate {
  id?: number;
  nomenclature: string;
  nsn: string;
  tamcn: string;
  technicalKnowledge: string;
  components?: TemplateComponent[];
  createdAt: number;
}

export interface EquipmentAsset {
  id?: number;
  templateId?: number;
  nomenclature: string;
  serialNumber: string;
  nsn: string;
  tamcn: string;
  owner: string;
  isInMaintenance: boolean;
  currentServiceRequest?: string;
  historicalServiceRequests: string[];
  notes: string;
  componentSerials?: Record<string, string>;
  createdAt: number;
}

export interface MaintenanceLog {
  id?: number;
  assetId: number;
  technician: string;
  serviceRequestId?: string;
  activityDescription: string;
  stepsTaken: string[];
  status: 'Ongoing' | 'Awaiting Parts' | 'Resolved' | 'Deferred';
  timestamp: number;
}

export class MaintainMateDB extends Dexie {
  assets!: Table<EquipmentAsset>;
  logs!: Table<MaintenanceLog>;
  templates!: Table<AssetTemplate>;

  constructor() {
    super('MaintainMateDB');
    this.version(5).stores({
      assets: '++id, templateId, nomenclature, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    });
  }
}

export const db = new MaintainMateDB();
