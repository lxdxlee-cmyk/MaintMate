
import Dexie, { type Table } from 'dexie';

export interface TemplateComponent {
  name: string;
  description: string;
  measurements: string; // e.g. "Nominal: 24VDC +/- 0.5V"
}

/**
 * Reusable Technical Knowledge Layer
 * Contains doctrine, specs, and structures independent of specific hardware units.
 */
export interface AssetTemplate {
  id?: number;
  nomenclature: string;
  nsn: string;
  tamcn: string;
  technicalKnowledge: string;
  components?: TemplateComponent[];
  createdAt: number;
}

/**
 * Serialized/Local Asset Layer
 * Contains unique unit identifiers and state, referencing a Technical Template.
 */
export interface EquipmentAsset {
  id?: number;
  templateId: number; // Reference to AssetTemplate
  serialNumber: string;
  owner: string;
  isInMaintenance: boolean;
  currentServiceRequest?: string;
  historicalServiceRequests: string[];
  notes: string;
  componentSerials?: Record<string, string>; // Maps template component names to unique serials
  createdAt: number;
}

/**
 * Maintenance/Event History Layer
 * Event records attached to specific Serialized Assets.
 */
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
    // Version 6: Strict separation of Technical Knowledge (Templates) and Serialized Assets
    this.version(6).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    }).upgrade(async tx => {
      // Logic for future migrations if data needs transformation
    });
  }
}

export const db = new MaintainMateDB();
