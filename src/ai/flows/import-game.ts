'use server';

/**
 * @fileOverview A flow for importing game data from a raw text log.
 *
 * - importGameFromText - A function that parses text and returns structured game data.
 * - ImportGameInput - The input type for the importGameFromText function.
 * - ImportGameOutput - The return type for the importGameFromText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Player, BuyIn } from '@/lib/types';

const ImportGameInputSchema = z.object({
  gameLog: z.string().describe('The raw text log of the poker game.'),
});
export type ImportGameInput = z.infer<typeof ImportGameInputSchema>;

const ImportGameOutputSchema = z.object({
  venue: z.string().describe("The name of the venue. Infer this if possible, otherwise use 'Imported Game'."),
  timestamp: z.string().describe('The date and time of the game in ISO format. Use the first date in the log.'),
  players: z.array(z.object({
      id: z.string(),
      name: z.string(),
      whatsappNumber: z.string(),
      buyIns: z.array(z.object({
          amount: z.number(),
          timestamp: z.string().describe("The timestamp of the buy-in in ISO format."),
          verified: z.boolean(),
      })),
      finalChips: z.number(),
  })).describe('An array of player data.'),
});
export type ImportGameOutput = z.infer<typeof ImportGameOutputSchema>;


export async function importGameFromText(input: ImportGameInput): Promise<ImportGameOutput> {
  return importGameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importGamePrompt',
  input: { schema: ImportGameInputSchema },
  output: { schema: ImportGameOutputSchema },
  prompt: `You are an expert at parsing poker game logs. Analyze the provided text log and convert it into a structured JSON format.

The log contains 'Buy In' and 'Chip Return' entries for multiple players.
- For each player, aggregate all 'Buy In' amounts. Each buy-in should be a separate entry in the 'buyIns' array.
- The 'Chip Return' amount for a player represents their 'finalChips'.
- If a player has 'Buy In' entries but no 'Chip Return' entry, their 'finalChips' should be 0.
- All buy-ins should be marked as 'verified: true'.
- Generate a unique ID for each player (e.g., 'player-import-1', 'player-import-2').
- Set the game 'timestamp' to the first date and time found in the log.
- Set 'whatsappNumber' to an empty string for all players.
- Infer the venue name from the log if possible, otherwise call it "Imported Game".

Game Log:
{{{gameLog}}}
`,
});

const importGameFlow = ai.defineFlow(
  {
    name: 'importGameFlow',
    inputSchema: ImportGameInputSchema,
    outputSchema: ImportGameOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to parse game log.');
    }
    return output;
  }
);
