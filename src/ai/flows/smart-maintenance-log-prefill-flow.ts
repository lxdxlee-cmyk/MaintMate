
'use server';
/**
 * @fileOverview A Genkit flow that suggests maintenance activity details based on equipment and component context.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMaintenancePrefillInputSchema = z.object({
  description: z.string().describe('Technician description of the task.'),
  nomenclature: z.string().describe('Equipment nomenclature.'),
  components: z.array(z.object({
    name: z.string(),
    measurements: z.string().optional(),
  })).optional(),
});

const SuggestMaintenancePrefillOutputSchema = z.object({
  suggestedSteps: z.array(z.string()),
  likelyStatus: z.enum(['Ongoing', 'Awaiting Parts', 'Resolved']),
});

export async function suggestMaintenancePrefill(input: z.infer<typeof SuggestMaintenancePrefillInputSchema>) {
  return smartMaintenanceLogPrefillFlow(input);
}

const prefillPrompt = ai.definePrompt({
  name: 'smartMaintenanceLogPrefillPrompt',
  input: {schema: SuggestMaintenancePrefillInputSchema},
  output: {schema: SuggestMaintenancePrefillOutputSchema},
  prompt: `You are an expert technical advisor.
Technician is working on: {{{nomenclature}}}.
Activity: {{{description}}}.

Context:
{{#each components}}
- {{{this.name}}}: {{{this.measurements}}}
{{/each}}

Suggest structured troubleshooting steps incorporating the technical specs provided.`,
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
