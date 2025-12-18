
'use server';

/**
 * @fileOverview A flow for generating a creative, poker-themed reminder message.
 *
 * - generatePokerReminder - A function that creates a motivational reminder message.
 * - GeneratePokerReminderInput - The input type for the function.
 * - GeneratePokerReminderOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePokerReminderInputSchema = z.object({
  gameDate: z.string().describe('The date of the game (e.g., "July 30, 2024").'),
  gameTime: z.string().describe('The start time of the game (e.g., "7:00 PM").'),
  clubName: z.string().describe('The name of the poker club.'),
  customMessage: z.string().optional().describe('An optional custom message from the admin to include.'),
});
export type GeneratePokerReminderInput = z.infer<typeof GeneratePokerReminderInputSchema>;

const GeneratePokerReminderOutputSchema = z.object({
  reminderTemplate: z.string().describe('The generated reminder message template.'),
});
export type GeneratePokerReminderOutput = z.infer<typeof GeneratePokerReminderOutputSchema>;

export async function generatePokerReminder(input: GeneratePokerReminderInput): Promise<GeneratePokerReminderOutput> {
  return generatePokerReminderFlow(input);
}

const reminderPrompt = ai.definePrompt({
  name: 'generatePokerReminderPrompt',
  input: { schema: GeneratePokerReminderInputSchema },
  output: { schema: GeneratePokerReminderOutputSchema },
  prompt: `
You are an enthusiastic poker club manager. Your task is to generate a short, friendly, and motivational reminder message for an upcoming game. The message should be sent via WhatsApp.

**Instructions:**
1.  Start with a friendly greeting that includes the placeholder **[Player Name]**.
2.  Announce the new game with its date ({{{gameDate}}}) and time ({{{gameTime}}}).
3.  Include a creative and motivational sentence using poker terminology (e.g., "Time to shuffle up and deal!", "Let's see who brings their A-game!", "May the flops be with you."). Be creative and vary the message.
4.  Add a clear call to action to book a seat. Include the website URL: **https://turnriver.online**
5.  If a custom message is provided ({{#if customMessage}}'{{{customMessage}}}'{{/if}}), incorporate it naturally into the message. If not, don't mention it.
6.  End with a signature for the club: "- {{{clubName}}}".
7.  The final output should be a single block of text formatted for WhatsApp.

**Example Output:**
"Hi [Player Name],

Get ready for our next game on Tuesday, July 30th at 7:00 PM. It's time to bring your best poker face!

Book your seat now at:
https://turnriver.online

See you at the table!

- The Poker Den"
`,
});

const generatePokerReminderFlow = ai.defineFlow(
  {
    name: 'generatePokerReminderFlow',
    inputSchema: GeneratePokerReminderInputSchema,
    outputSchema: GeneratePokerReminderOutputSchema,
  },
  async (input) => {
    const { output } = await reminderPrompt(input);
    if (!output) {
      throw new Error('Failed to generate reminder message.');
    }
    return output;
  }
);
