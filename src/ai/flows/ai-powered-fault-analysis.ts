
'use server';
/**
 * @fileOverview A Genkit flow for AI-powered fault analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComponentSpecSchema = z.object({
  name: z.string(),
  alias: z.string().optional(),
  purpose: z.string().optional(),
  measurements: z.string().optional().describe('Structured measurements/specs.'),
  knownFaults: z.array(z.object({
    symptom: z.string(),
    cause: z.string(),
    fix: z.string(),
  })).optional(),
});

const ConnectionSchema = z.object({
  type: z.string(),
  connectorType: z.string().optional(),
  sourceComponent: z.string(),
  destComponent: z.string(),
  cableId: z.string().optional(),
  notes: z.string().optional(),
});

const AssemblySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  components: z.array(ComponentSpecSchema),
});

const MaintenanceLogEntrySchema = z.object({
  faultObserved: z.string(),
  repairActions: z.string(),
  outcome: z.string(),
  timestamp: z.string(),
});

const AIPoweredFaultAnalysisInputSchema = z.object({
  equipmentType: z.string(),
  nsn: z.string().optional(),
  tamcn: z.string().optional(),
  technicalKnowledge: z.string().optional().describe('Freeform field notes or tribal knowledge.'),
  assemblies: z.array(AssemblySchema).optional().describe('Hierarchical technical structure.'),
  connections: z.array(ConnectionSchema).optional().describe('System-wide wiring and signal paths.'),
  currentFaultDescription: z.string().describe('A detailed description of the fault currently observed.'),
  historicalMaintenanceLogs: z.array(MaintenanceLogEntrySchema).describe('Past maintenance history.'),
});

const AIPoweredFaultAnalysisOutputSchema = z.object({
  summary: z.string(),
  commonProblems: z.array(z.string()),
  potentialCauses: z.array(z.string()),
  troubleshootingSteps: z.array(z.string()),
});

export async function aiPoweredFaultAnalysis(input: z.infer<typeof AIPoweredFaultAnalysisInputSchema>) {
  return aiPoweredFaultAnalysisFlow(input);
}

const aiPoweredFaultAnalysisPrompt = ai.definePrompt({
  name: 'aiPoweredFaultAnalysisPrompt',
  input: { schema: AIPoweredFaultAnalysisInputSchema },
  output: { schema: AIPoweredFaultAnalysisOutputSchema },
  prompt: `You are an expert technical diagnostician specializing in ground electronics maintenance.
Analyze the fault for: {{{equipmentType}}} (NSN: {{{nsn}}}).

Technical Topology & Specs:
Assemblies:
{{#each assemblies}}
- Assembly: {{{this.name}}}
  Components:
  {{#each this.components}}
  - {{{this.name}}} ({{{this.purpose}}})
    Specs: {{{this.measurements}}}
    Known Faults: {{#each this.knownFaults}}{{{this.symptom}}} -> {{{this.fix}}}; {{/each}}
  {{/each}}
{{/each}}

System-Wide Signal Paths / Connections:
{{#each connections}}
- {{{this.type}}} [{{{this.cableId}}}] : {{{this.sourceComponent}}} -> {{{this.destComponent}}} ({{{this.connectorType}}}) {{{this.notes}}}
{{/each}}

Field Knowledge (Tribal): {{{technicalKnowledge}}}

Observed Fault: {{{currentFaultDescription}}}

Maintenance History:
{{#each historicalMaintenanceLogs}}
- {{{this.faultObserved}}} | Actions: {{{this.repairActions}}} | Outcome: {{{this.outcome}}}
{{/each}}

Provide a high-fidelity diagnostic report. Map potential failures against the structured connection paths and component measurements provided. Ensure steps align with standard electronics troubleshooting procedures (e.g., check signal path continuity, verify power rails).`
});

const aiPoweredFaultAnalysisFlow = ai.defineFlow(
  {
    name: 'aiPoweredFaultAnalysisFlow',
    inputSchema: AIPoweredFaultAnalysisInputSchema,
    outputSchema: AIPoweredFaultAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await aiPoweredFaultAnalysisPrompt(input);
    return output!;
  }
);
