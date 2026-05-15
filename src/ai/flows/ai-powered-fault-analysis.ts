
'use server';
/**
 * @fileOverview A Genkit flow for AI-powered fault analysis.
 *
 * - aiPoweredFaultAnalysis - A function that analyzes historical maintenance logs and component specs to suggest troubleshooting steps.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComponentSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  measurements: z.string(),
});

const MaintenanceLogEntrySchema = z.object({
  faultObserved: z.string().describe('Description of the fault observed.'),
  repairActions: z.string().describe('Description of the repair actions performed.'),
  outcome: z.string().describe('The outcome of the repair.'),
  notes: z.string().optional(),
  timestamp: z.string(),
});

const AIPoweredFaultAnalysisInputSchema = z.object({
  equipmentType: z.string().describe('The nomenclature/type of the equipment.'),
  nsn: z.string().optional(),
  tamcn: z.string().optional(),
  technicalKnowledge: z.string().optional().describe('Specific technical manual knowledge or reference data.'),
  components: z.array(ComponentSpecSchema).optional().describe('Sub-systems and their technical specs.'),
  currentFaultDescription: z.string().describe('A detailed description of the fault currently observed.'),
  historicalMaintenanceLogs: z.array(MaintenanceLogEntrySchema).describe('Past maintenance history.'),
});
export type AIPoweredFaultAnalysisInput = z.infer<typeof AIPoweredFaultAnalysisInputSchema>;

const AIPoweredFaultAnalysisOutputSchema = z.object({
  summary: z.string(),
  commonProblems: z.array(z.string()),
  potentialCauses: z.array(z.string()),
  troubleshootingSteps: z.array(z.string().describe('Steps including specific technical measurements from component specs.')),
});
export type AIPoweredFaultAnalysisOutput = z.infer<typeof AIPoweredFaultAnalysisOutputSchema>;

export async function aiPoweredFaultAnalysis(input: AIPoweredFaultAnalysisInput): Promise<AIPoweredFaultAnalysisOutput> {
  return aiPoweredFaultAnalysisFlow(input);
}

const aiPoweredFaultAnalysisPrompt = ai.definePrompt({
  name: 'aiPoweredFaultAnalysisPrompt',
  input: { schema: AIPoweredFaultAnalysisInputSchema },
  output: { schema: AIPoweredFaultAnalysisOutputSchema },
  prompt: `You are an expert maintenance diagnostician for complex equipment. 
Analyze the current fault for: {{{equipmentType}}} (NSN: {{{nsn}}}, TAMCN: {{{tamcn}}}).

{{#if technicalKnowledge}}
Reference Knowledge Base:
{{{technicalKnowledge}}}
{{/if}}

{{#if components}}
Component-Specific Data (Use these measurements in troubleshooting steps):
{{#each components}}
- Component: {{{this.name}}}
  Desc: {{{this.description}}}
  Required Measurements: {{{this.measurements}}}
{{/each}}
{{/if}}

Current Fault Observed: {{{currentFaultDescription}}}

Historical Context:
{{#if historicalMaintenanceLogs}}
  {{#each historicalMaintenanceLogs}}
  - Record: {{{this.faultObserved}}} | Actions: {{{this.repairActions}}} | Outcome: {{{this.outcome}}}
  {{/each}}
{{else}}
  No historical logs for this specific unit.
{{/if}}

Provide a detailed diagnostic report:
1. Summary of analysis.
2. Likely causes (prioritized).
3. Specific troubleshooting steps. INTEGRATE the measurements provided in the Component Data section into these steps (e.g., "Step X: Verify voltage at [Component], expect [Measurement]").
4. Historical patterns for this nomenclature.`
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
