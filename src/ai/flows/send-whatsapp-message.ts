'use server';

/**
 * @fileOverview A flow for sending WhatsApp messages.
 *
 * - sendWhatsappMessage - A function that sends a message to a WhatsApp number.
 * - SendWhatsappMessageInput - The input type for the sendWhatsappMessage function.
 * - SendWhatsappMessageOutput - The return type for the sendWhatsappMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendWhatsappMessageInputSchema = z.object({
  to: z.string().describe('The recipient WhatsApp number.'),
  message: z.string().describe('The message content to send.'),
});
export type SendWhatsappMessageInput = z.infer<typeof SendWhatsappMessageInputSchema>;

const SendWhatsappMessageOutputSchema = z.object({
  success: z.boolean().describe('Whether the message was sent successfully.'),
  messageId: z.string().optional().describe('The ID of the sent message.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendWhatsappMessageOutput = z.infer<typeof SendWhatsappMessageOutputSchema>;

export async function sendWhatsappMessage(input: SendWhatsappMessageInput): Promise<SendWhatsappMessageOutput> {
  return sendWhatsappMessageFlow(input);
}

const sendWhatsappMessageFlow = ai.defineFlow(
  {
    name: 'sendWhatsappMessageFlow',
    inputSchema: SendWhatsappMessageInputSchema,
    outputSchema: SendWhatsappMessageOutputSchema,
  },
  async ({ to, message }) => {
    const fromPhoneNumberId = process.env.WHATSAPP_MOBILE_NUMBER;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    if (!fromPhoneNumberId || !apiToken) {
      console.error('WhatsApp credentials are not set in .env file.');
      return { success: false, error: 'Server configuration error: WhatsApp credentials missing.' };
    }

    const url = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message },
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Failed to send WhatsApp message:', responseData);
        return { success: false, error: responseData.error?.message || 'Unknown error from WhatsApp API.' };
      }

      return { success: true, messageId: responseData.messages[0]?.id };

    } catch (error) {
      console.error('Error in sendWhatsappMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
