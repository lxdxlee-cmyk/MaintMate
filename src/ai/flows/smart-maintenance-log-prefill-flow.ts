'use server';
/**
 * @fileOverview A Genkit flow that suggests common maintenance details (repair actions, parts, outcome) based on a fault description and equipment type.
 *
 * - suggestMaintenancePrefill - A function that handles the prefilling suggestions process.
 * - SuggestMaintenancePrefillInput - The input type for the suggestMaintenancePrefill function.
 * - SuggestMaintenancePrefillOutput - The return type for the suggestMaintenancePrefill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMaintenancePrefillInputSchema = z.object({
  faultDescription: z.string().describe('A brief description of the observed fault.'),
  equipmentType: z.string().describe('The type of equipment being maintained.'),
});
export type SuggestMaintenancePrefillInput = z.infer<
  typeof SuggestMaintenancePrefillInputSchema
>;

const SuggestMaintenancePrefillOutputSchema = z.object({
  repairActions: z
    .array(z.string())
    .describe('Suggested common repair actions for the described fault and equipment type.'),
  partsUsed:
    z.array(z.string()).describe('Suggested common parts that might be used for this repair.'),
  outcomeDescription: z.string().describe('A suggested outcome description for the repair.'),
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
  prompt: `You are an expert maintenance technician tasked with assisting a maintainer in quickly documenting maintenance.
Based on the provided fault description and equipment type, suggest common repair actions, typical parts that might be used, and a concise outcome description.
These suggestions should be practical and relevant to a real-world maintenance scenario for the given equipment.

Equipment Type: {{{equipmentType}}}
Fault Description: {{{faultDescription}}}

Provide your suggestions in a JSON object with the following structure. Do not include any additional text or formatting outside of the JSON.`,
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
