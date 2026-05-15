
import Dexie, { type Table } from 'dexie';

export interface TechnicalConnection {
  id: string;
  type: 'Ethernet' | 'Serial' | 'RF' | 'Power' | 'Grounding' | 'Control' | 'Signal' | 'Other';
  connectorType?: string; // e.g. BNC, RJ45, DB9
  sourceComponentId: string;
  destComponentId: string;
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
  connections: TechnicalConnection[]; // Moved to template level for cross-assembly mapping
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
  maintenanceLocation?: string; // Where it is while being fixed
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
    
    // Version 9: Initial structure
    this.version(9).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    });

    // Version 10: Move connections from assembly to template level
    this.version(10).stores({
      assets: '++id, templateId, serialNumber, owner, isInMaintenance, createdAt',
      logs: '++id, assetId, technician, status, timestamp, serviceRequestId',
      templates: '++id, nomenclature, nsn, tamcn'
    }).upgrade(async (trans) => {
      // Migration: Move existing assembly-level connections to the template level
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
