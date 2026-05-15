
import Dexie, { type Table } from 'dexie';

export interface TechnicalConnection {
  type: 'Ethernet' | 'Serial' | 'RF' | 'Power' | 'Grounding' | 'Control' | 'Signal';
  sourceComponent: string;
  destComponent: string;
  sourcePort?: string;
  destPort?: string;
  cableId?: string;
  notes?: string;
}

export interface ExpectedMeasurement {
  name: string;
  value: string; // e.g. "24VDC +/- 0.5V"
}

export interface KnownFault {
  symptom: string;
  cause: string;
  fix: string;
}

export interface TechnicalProcedure {
  title: string;
  steps: string[];
}

export interface TechnicalComponent {
  id: string; // Unique identifier within the template
  name: string;
  alias?: string;
  purpose?: string;
  notes?: string;
  ports?: string[];
  expectedMeasurements?: ExpectedMeasurement[];
  knownFaults?: KnownFault[];
  procedures?: TechnicalProcedure[];
}

export interface TechnicalAssembly {
  name: string;
  description?: string;
  components: TechnicalComponent[];
  connections: TechnicalConnection[];
}

/**
 * Reusable Technical Knowledge Layer (PUBS)
 */
export interface AssetTemplate {
  id?: number;
  nomenclature: string;
  nsn: string;
  tamcn: string;
  technicalKnowledge: string; // Freeform tribal knowledge/field notes
  assemblies: TechnicalAssembly[];
  createdAt: number;
}

/**
 * Serialized/Local Asset Layer (GEAR)
 */
export interface EquipmentAsset {
  id?: number;
  templateId: number; 
  serialNumber: string;
  owner: string;
  isInMaintenance: boolean;
  currentServiceRequest?: string;
  historicalServiceRequests: string[];
  notes: string;
  componentSerials?: Record<string, string>; // Maps component IDs to unique serials
  createdAt: number;
}

/**
 * Maintenance/Event History Layer (ERO)
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
    // Version 7: Hierarchical Technical Knowledge Framework
    this.version(7).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    });
  }
}

export const db = new MaintainMateDB();
