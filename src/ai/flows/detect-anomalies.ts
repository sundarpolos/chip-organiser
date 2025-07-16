'use server';

/**
 * @fileOverview Detects unusual buy-in patterns during the game.
 *
 * - detectAnomalousBuyins - A function that analyzes buy-in data and returns an anomaly score.
 * - DetectAnomalousBuyinsInput - The input type for the detectAnomalousBuyins function.
 * - DetectAnomalousBuyinsOutput - The return type for the detectAnomalousBuyins function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAnomalousBuyinsInputSchema = z.object({
  playerBuyIns: z.array(
    z.object({
      playerName: z.string().describe('The name of the player.'),
      amount: z.number().describe('The amount of the buy-in.'),
      timestamp: z.string().describe('The timestamp of the buy-in.'),
    })
  ).describe('An array of buy-in records for the current game.'),
  historicalBuyIns: z.array(
    z.object({
      playerName: z.string().describe('The name of the player.'),
      amount: z.number().describe('The amount of the buy-in.'),
      timestamp: z.string().describe('The timestamp of the buy-in.'),
    })
  ).describe('An array of historical buy-in records for the player.'),
});
export type DetectAnomalousBuyinsInput = z.infer<typeof DetectAnomalousBuyinsInputSchema>;

const DetectAnomalousBuyinsOutputSchema = z.object({
  anomalyScore: z.number().describe('A score indicating the degree of anomaly in the buy-in pattern. Higher values indicate greater anomaly.'),
  explanation: z.string().describe('A textual explanation of why the buy-in pattern is considered anomalous.'),
});
export type DetectAnomalousBuyinsOutput = z.infer<typeof DetectAnomalousBuyinsOutputSchema>;

export async function detectAnomalousBuyins(input: DetectAnomalousBuyinsInput): Promise<DetectAnomalousBuyinsOutput> {
  return detectAnomalousBuyinsFlow(input);
}

const detectAnomalousBuyinsPrompt = ai.definePrompt({
  name: 'detectAnomalousBuyinsPrompt',
  input: {schema: DetectAnomalousBuyinsInputSchema},
  output: {schema: DetectAnomalousBuyinsOutputSchema},
  prompt: `You are an expert in detecting fraudulent behavior in poker games. Analyze the provided buy-in data to identify any unusual patterns that may indicate cheating or other illicit activities.

Consider factors such as the amount and timing of buy-ins, and compare them to the player's historical buy-in behavior. Provide an anomaly score between 0 and 1, where 0 indicates no anomaly and 1 indicates a high degree of anomaly. Also, provide a concise explanation of why the buy-in pattern is considered anomalous.

Current Buy-ins:
{{#each playerBuyIns}}
- Player: {{playerName}}, Amount: {{amount}}, Timestamp: {{timestamp}}
{{/each}}

Historical Buy-ins:
{{#each historicalBuyIns}}
- Player: {{playerName}}, Amount: {{amount}}, Timestamp: {{timestamp}}
{{/each}}
`,
});

const detectAnomalousBuyinsFlow = ai.defineFlow(
  {
    name: 'detectAnomalousBuyinsFlow',
    inputSchema: DetectAnomalousBuyinsInputSchema,
    outputSchema: DetectAnomalousBuyinsOutputSchema,
  },
  async input => {
    const {output} = await detectAnomalousBuyinsPrompt(input);
    return output!;
  }
);
