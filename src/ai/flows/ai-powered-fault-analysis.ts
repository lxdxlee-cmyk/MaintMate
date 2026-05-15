
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
  prompt: `You are an expert technical diagnostician.
Analyze the fault for: {{{equipmentType}}} (NSN: {{{nsn}}}).

Hierarchy & Specs:
{{#each assemblies}}
Assembly: {{{this.name}}}
{{#each this.components}}
- Component: {{{this.name}}} ({{{this.purpose}}})
  Measurements: {{{this.measurements}}}
  Known Faults: {{#each this.knownFaults}}{{{this.symptom}}} -> {{{this.fix}}}; {{/each}}
{{/each}}
{{/each}}

Field Knowledge: {{{technicalKnowledge}}}

Observed Fault: {{{currentFaultDescription}}}

History:
{{#each historicalMaintenanceLogs}}
- {{{this.faultObserved}}} | Actions: {{{this.repairActions}}} | Outcome: {{{this.outcome}}}
{{/each}}

Provide a diagnostic report mapping logic against the provided assembly/component structure.`
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
