
'use server';
/**
 * @fileOverview A Genkit flow that suggests maintenance activity details (steps, measurements, status) based on equipment context.
 *
 * - suggestMaintenancePrefill - A function that handles the prefilling suggestions process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMaintenancePrefillInputSchema = z.object({
  description: z.string().describe('A brief description of the current task or observed issue.'),
  nomenclature: z.string().describe('The formal nomenclature of the equipment.'),
});
export type SuggestMaintenancePrefillInput = z.infer<
  typeof SuggestMaintenancePrefillInputSchema
>;

const SuggestMaintenancePrefillOutputSchema = z.object({
  suggestedSteps: z
    .array(z.string())
    .describe('Step-by-step troubleshooting or maintenance actions, including specific technical measurements or expected readings to verify.'),
  likelyStatus: z.enum(['Ongoing', 'Awaiting Parts', 'Resolved']).describe('The most likely status of the task.'),
});
export type SuggestMaintenancePrefillOutput = z.infer<
  typeof SuggestMaintenancePrefillOutputSchema
>;

export async function suggestMaintenancePrefill(
  input: SuggestMaintenancePrefillInput
): Promise<SuggestMaintenancePrefillOutput> {
  return smartMaintenanceLogPrefillFlow(input);
}

const prefillPrompt = ai.definePrompt({
  name: 'smartMaintenanceLogPrefillPrompt',
  input: {schema: SuggestMaintenancePrefillInputSchema},
  output: {schema: SuggestMaintenancePrefillOutputSchema},
  prompt: `You are an expert technical advisor for complex machinery.
A technician is working on: {{{nomenclature}}}.
They describe their current activity as: {{{description}}}.

Suggest:
1. A logical sequence of troubleshooting steps or maintenance actions.
2. Integrate specific technical measurements, tolerances, or readings they should record directly into these steps (e.g., "Step 2: Check voltage at J1, expect 24VDC +/- 0.5").
3. Based on the complexity, suggest if this is likely "Ongoing" or can be "Resolved" immediately.

Provide your suggestions in a JSON object. Ensure steps are concise and technically accurate.`,
});

const smartMaintenanceLogPrefillFlow = ai.defineFlow(
  {
    name: 'smartMaintenanceLogPrefillFlow',
    inputSchema: SuggestMaintenancePrefillInputSchema,
    outputSchema: SuggestMaintenancePrefillOutputSchema,
  },
  async input => {
    const {output} = await prefillPrompt(input);
    return output!;
  }
);
