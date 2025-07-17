'use server';

/**
 * @fileOverview A flow for sending WhatsApp messages.
 *
 * - sendWhatsappMessage - A function that sends a message to a WhatsApp number.
 * - SendWhatsappMessageInput - The input type for the sendWhatsappMessage function.
 * - SendWhatsappMessageOutput - The return type for the sendWhatsappMessage function.
 */
import { config } from 'dotenv';
config();

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
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL;
    const senderMobile = process.env.WHATSAPP_SENDER_MOBILE;

    if (!apiToken || !apiUrl || !senderMobile) {
      const errorMsg = 'WhatsApp credentials, sender number, or API URL are not set in env file.';
      console.error(errorMsg, { apiToken: !!apiToken, apiUrl: !!apiUrl, senderMobile: !!senderMobile});
      return { success: false, error: `Server configuration error: ${errorMsg}` };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('receiver', to);
      formData.append('msgtext', message);
      formData.append('token', apiToken);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse API response as JSON:', responseText);
        return { success: false, error: `Invalid API response: ${responseText}` };
      }
      
      if (!response.ok || String(responseData.success).toLowerCase() !== 'true') {
        console.error('Failed to send WhatsApp message. API Response:', responseData);
        const apiError = responseData.error || responseData.message || `API returned status ${response.status}`;
        return { success: false, error: apiError };
      }
      
      return { success: true, messageId: responseData.message_id || responseData.messageId || 'N/A' };

    } catch (error) {
      console.error('Error in sendWhatsappMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while sending the message.';
      return { success: false, error: errorMessage };
    }
  }
);
