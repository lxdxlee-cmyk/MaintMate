
'use server';
/**
 * @fileOverview A Genkit flow for AI-powered fault analysis using full system topology.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComponentSpecSchema = z.object({
  name: z.string(),
  alias: z.string().optional(),
  purpose: z.string().optional(),
  measurements: z.string().optional().describe('Structured measurements/specs.'),
  ports: z.array(z.string()).optional().describe('Available plugs and port labels.'),
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
  sourcePort: z.string().optional(),
  destComponent: z.string(),
  destPort: z.string().optional(),
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
  technicalKnowledge: z.string().optional(),
  assemblies: z.array(AssemblySchema).optional(),
  connections: z.array(ConnectionSchema).optional(),
  currentFaultDescription: z.string().describe('Detailed description of the fault observed.'),
  historicalMaintenanceLogs: z.array(MaintenanceLogEntrySchema),
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
  prompt: `You are an expert technical diagnostician. Analyze this fault for: {{{equipmentType}}}.

System Topology (Signal Paths & Signal Flow):
{{#each connections}}
- {{{this.type}}} Link: {{{this.sourceComponent}}}{{#if this.sourcePort}} (Port: {{{this.sourcePort}}}){{/if}} -> {{{this.destComponent}}}{{#if this.destPort}} (Port: {{{this.destPort}}}){{/if}} [Cable: {{{this.cableId}}}]
  Notes: {{{this.notes}}}
{{/each}}

System Hierarchy & Components:
{{#each assemblies}}
- Subsystem: {{{this.name}}}
  Components:
  {{#each this.components}}
  - {{{this.name}}} (Purpose: {{{this.purpose}}})
    Specs/Expected: {{{this.measurements}}}
    Available Ports: {{#each this.ports}}{{{this}}}, {{/each}}
    Known Faults: {{#each this.knownFaults}}{{{this.symptom}}} -> {{{this.fix}}}; {{/each}}
  {{/each}}
{{/each}}

Field Notes: {{{technicalKnowledge}}}

Observed Fault: {{{currentFaultDescription}}}

Maintenance History:
{{#each historicalMaintenanceLogs}}
- {{{this.faultObserved}}} | Actions: {{{this.repairActions}}} | Outcome: {{{this.outcome}}}
{{/each}}

Analyze the fault using the structured connections. Identify if the signal path is broken at specific port interfaces or across cable IDs. Suggest troubleshooting steps aligned with the system's wiring and component specs.`
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
