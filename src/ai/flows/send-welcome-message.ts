
'use server';

/**
 * @fileOverview A flow for sending a welcome message to a new player.
 *
 * - sendWelcomeMessage - A function that sends a welcome and feature overview message.
 * - SendWelcomeMessageInput - The input type for the sendWelcomeMessage function.
 * - SendWelcomeMessageOutput - The return type for the sendWelcomeMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SendWelcomeMessageInputSchema = z.object({
  playerName: z.string().describe('The name of the new player.'),
  clubName: z.string().describe('The name of the club the player is joining.'),
  whatsappNumber: z.string().describe("The new player's WhatsApp number."),
  whatsappConfig: z
    .object({
      apiUrl: z.string().optional(),
      apiToken: z.string().optional(),
      senderMobile: z.string().optional(),
    })
    .describe('WhatsApp API credentials.'),
});
export type SendWelcomeMessageInput = z.infer<typeof SendWelcomeMessageInputSchema>;

const SendWelcomeMessageOutputSchema = z.object({
  success: z.boolean().describe('Whether the message was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendWelcomeMessageOutput = z.infer<typeof SendWelcomeMessageOutputSchema>;

export async function sendWelcomeMessage(input: SendWelcomeMessageInput): Promise<SendWelcomeMessageOutput> {
  return sendWelcomeMessageFlow(input);
}

const welcomeMessagePrompt = ai.definePrompt({
  name: 'welcomeMessagePrompt',
  input: {
    schema: z.object({
      playerName: z.string(),
      clubName: z.string(),
    }),
  },
  prompt: `Hi {{{playerName}}}, welcome to *{{{clubName}}}* on Chip Maestro! 🃏

You can log in to view game details and your stats at any time using this WhatsApp number.

Access the dashboard here:
https://turnriver.online

See you at the tables!`,
});

const sendWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'sendWelcomeMessageFlow',
    inputSchema: SendWelcomeMessageInputSchema,
    outputSchema: SendWelcomeMessageOutputSchema,
  },
  async ({ playerName, clubName, whatsappNumber, whatsappConfig }) => {
    if (!whatsappNumber) {
      return { success: false, error: 'WhatsApp number is not provided.' };
    }

    try {
      const response = await welcomeMessagePrompt({ playerName, clubName });
      const message = response.text;

      const whatsappPayload: SendWhatsappMessageInput = {
        to: whatsappNumber,
        message,
        ...whatsappConfig,
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);

      if (whatsappResult.success) {
        return { success: true };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send welcome message.' };
      }
    } catch (error) {
      console.error('Error in sendWelcomeMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
