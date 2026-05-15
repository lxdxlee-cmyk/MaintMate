
import Dexie, { type Table } from 'dexie';

export interface EquipmentAsset {
  id?: number;
  nomenclature: string;
  serialNumber: string;
  owner: string;
  isInMaintenance: boolean;
  currentServiceRequest?: string;
  historicalServiceRequests: string[];
  notes: string;
  createdAt: number;
}

export interface MaintenanceLog {
  id?: number;
  assetId: number;
  technician: string;
  serviceRequestId?: string;
  activityDescription: string;
  stepsTaken: string[];
  measurements?: string;
  status: 'Ongoing' | 'Awaiting Parts' | 'Resolved' | 'Deferred';
  timestamp: number;
}

export class MaintainMateDB extends Dexie {
  assets!: Table<EquipmentAsset>;
  logs!: Table<MaintenanceLog>;

  constructor() {
    super('MaintainMateDB');
    this.version(2).stores({
      assets: '++id, nomenclature, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId'
    });
  }
}

export const db = new MaintainMateDB();
