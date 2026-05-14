'use server';
/**
 * @fileOverview A Genkit flow for AI-powered fault analysis.
 *
 * - aiPoweredFaultAnalysis - A function that analyzes historical maintenance logs to suggest common problems, causes, and troubleshooting steps.
 * - AIPoweredFaultAnalysisInput - The input type for the aiPoweredFaultAnalysis function.
 * - AIPoweredFaultAnalysisOutput - The return type for the aiPoweredFaultAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaintenanceLogEntrySchema = z.object({
  faultObserved: z.string().describe('Description of the fault observed.'),
  repairActions: z.string().describe('Description of the repair actions performed.'),
  outcome: z.string().describe('The outcome of the repair, e.g., "resolved", "temporary fix".'),
  notes: z.string().optional().describe('Any additional notes for the maintenance log.'),
  timestamp: z.string().describe('Timestamp when the maintenance action was recorded.'),
});

const AIPoweredFaultAnalysisInputSchema = z.object({
  equipmentType: z.string().describe('The type of the equipment asset (e.g., "Lathe", "Forklift").'),
  currentFaultDescription: z.string().describe('A detailed description of the fault currently observed on the equipment.'),
  historicalMaintenanceLogs: z.array(MaintenanceLogEntrySchema).describe('An array of past maintenance log entries for this equipment type, if available.'),
});
export type AIPoweredFaultAnalysisInput = z.infer<typeof AIPoweredFaultAnalysisInputSchema>;

const AIPoweredFaultAnalysisOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the fault analysis, combining historical context with the current issue.'),
  commonProblems: z.array(z.string()).describe('A list of common problems historically associated with this equipment type.'),
  potentialCauses: z.array(z.string()).describe('A list of potential causes for the current fault, based on historical data and common knowledge.'),
  troubleshootingSteps: z.array(z.string()).describe('A list of suggested troubleshooting steps or repair actions.'),
});
export type AIPoweredFaultAnalysisOutput = z.infer<typeof AIPoweredFaultAnalysisOutputSchema>;

export async function aiPoweredFaultAnalysis(input: AIPoweredFaultAnalysisInput): Promise<AIPoweredFaultAnalysisOutput> {
  return aiPoweredFaultAnalysisFlow(input);
}

const aiPoweredFaultAnalysisPrompt = ai.definePrompt({
  name: 'aiPoweredFaultAnalysisPrompt',
  input: { schema: AIPoweredFaultAnalysisInputSchema },
  output: { schema: AIPoweredFaultAnalysisOutputSchema },
  prompt: `You are an expert maintenance diagnostician for industrial and shop equipment. Your task is to analyze a current equipment fault description in the context of its historical maintenance logs and the equipment type.\n\nEquipment Type: {{{equipmentType}}}\nCurrent Fault Observed: {{{currentFaultDescription}}}\n\nHistorical Maintenance Logs for similar equipment (if available):\n{{#if historicalMaintenanceLogs}}\n  {{#each historicalMaintenanceLogs}}\n    - Log Entry #{{add @index 1}}:\n      - Fault Observed: "{{{this.faultObserved}}}"\n      - Repair Actions: "{{{this.repairActions}}}"\n      - Outcome: "{{{this.outcome}}}"\n      - Notes: "{{{this.notes}}}"\n      - Timestamp: "{{{this.timestamp}}}"\n  {{/each}}\n{{else}}\n  No historical maintenance logs provided. Base analysis on general knowledge for "{{{equipmentType}}}" and the current fault description.\n{{/if}}\n\nBased on the above information, provide:\n1. A brief summary of your analysis.\n2. A list of common problems that this equipment type typically experiences.\n3. A list of potential causes for the "Current Fault Observed".\n4. A list of concrete troubleshooting steps or repair actions that a maintainer can take.\n\nEnsure your response is structured as a JSON object strictly conforming to the output schema.\n`
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
