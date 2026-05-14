
import Dexie, { type Table } from 'dexie';

export interface EquipmentAsset {
  id?: number;
  type: string;
  identifier: string;
  owner: string;
  parentId?: number;
  notes: string;
  createdAt: number;
}

export interface MaintenanceLog {
  id?: number;
  assetId: number;
  technician: string;
  faultObserved: string;
  repairActions: string;
  partsUsed: string[];
  outcome: string;
  notes: string;
  timestamp: number;
}

export class MaintainMateDB extends Dexie {
  assets!: Table<EquipmentAsset>;
  logs!: Table<MaintenanceLog>;

  constructor() {
    super('MaintainMateDB');
    this.version(1).stores({
      assets: '++id, type, identifier, parentId, createdAt',
      logs: '++id, assetId, technician, timestamp'
    });
  }
}

export const db = new MaintainMateDB();
