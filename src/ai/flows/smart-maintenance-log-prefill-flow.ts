
'use server';
/**
 * @fileOverview A Genkit flow that suggests maintenance activity details based on equipment and component context.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComponentSpecSchema = z.object({
  name: z.string(),
  measurements: z.string(),
});

const SuggestMaintenancePrefillInputSchema = z.object({
  description: z.string().describe('A brief description of the current task or observed issue.'),
  nomenclature: z.string().describe('The formal nomenclature of the equipment.'),
  components: z.array(ComponentSpecSchema).optional().describe('Components and their known specs.'),
});
export type SuggestMaintenancePrefillInput = z.infer<
  typeof SuggestMaintenancePrefillInputSchema
>;

const SuggestMaintenancePrefillOutputSchema = z.object({
  suggestedSteps: z
    .array(z.string())
    .describe('Step-by-step actions, incorporating specific technical measurements from the components if applicable.'),
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

{{#if components}}
Technical Context (Sub-systems):
{{#each components}}
- {{{this.name}}}: {{{this.measurements}}}
{{/each}}
{{/if}}

Suggest:
1. A logical sequence of troubleshooting steps or maintenance actions.
2. INTEGRATE the technical measurements/readings provided in the Technical Context directly into these steps where relevant.
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
