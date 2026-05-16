
import Dexie, { type Table } from 'dexie';

export interface TechnicalConnection {
  id: string;
  type: 'Ethernet' | 'Serial' | 'RF' | 'Power' | 'Grounding' | 'Control' | 'Signal' | 'Other';
  connectorType?: string; // e.g. BNC, RJ45, DB9
  sourceComponentId: string;
  destComponentId: string;
  sourcePort?: string; // Added: specific port on source
  destPort?: string;   // Added: specific port on destination
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
  ports?: string[]; // Added: list of plug/port labels
  expectedMeasurements?: ExpectedMeasurement[];
  knownFaults?: KnownFault[];
  procedures?: TechnicalProcedure[];
}

export interface TechnicalAssembly {
  name: string;
  description?: string;
  components: TechnicalComponent[];
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
  connections: TechnicalConnection[]; // Global system-level connections
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
  maintenanceLocation?: string; 
  isInMaintenance: boolean;
  currentServiceRequest?: string;
  historicalServiceRequests: string[];
  notes: string;
  componentSerials?: Record<string, string>; 
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
    
    // Version 11: Added Ports to components and port-specific connection tracking
    this.version(11).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    });

    // Intermediate migration for version 10 was kept for historical reference
    this.version(10).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    }).upgrade(async (trans) => {
      const templates = await trans.table('templates').toArray();
      for (const template of templates) {
        const globalConnections: TechnicalConnection[] = template.connections || [];
        if (template.assemblies) {
          template.assemblies.forEach((asm: any) => {
            if (asm.connections && Array.isArray(asm.connections)) {
              globalConnections.push(...asm.connections);
              delete asm.connections;
            }
          });
        }
        await trans.table('templates').update(template.id, {
          connections: globalConnections,
          assemblies: template.assemblies
        });
      }
    });
  }
}

export const db = new MaintainMateDB();
