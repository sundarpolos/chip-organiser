
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
  apiUrl: z.string().optional().describe('The WhatsApp API URL.'),
  apiToken: z.string().optional().describe('The WhatsApp API Token.'),
  senderMobile: z.string().optional().describe('The sender WhatsApp number.'),
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
  async ({ to, message, apiUrl, apiToken, senderMobile }) => {
    // Prefer credentials passed in, but fall back to environment variables
    const finalApiUrl = apiUrl || process.env.WHATSAPP_API_URL;
    const finalApiToken = apiToken || process.env.WHATSAPP_API_TOKEN;
    const finalSenderMobile = senderMobile || process.env.WHATSAPP_SENDER_MOBILE;

    if (!finalApiUrl || !finalApiToken) {
      const errorMsg = 'WhatsApp API URL and Token are not configured. Please provide them in the WA Settings or in the .env file.';
      console.error(errorMsg);
      return { success: false, error: `Server configuration error: ${errorMsg}` };
    }

    try {
      // Construct the URL with query parameters for a GET request, exactly like the PHP example
      const params = new URLSearchParams({
        token: finalApiToken,
        receiver: to,
        msgtext: message,
      });

      // The sender parameter might also be needed for some APIs. The PHP code didn't show it, but we'll include it if present.
      if (finalSenderMobile) {
        params.append('sender', finalSenderMobile);
      }
      
      const url = `${finalApiUrl}?${params.toString()}`;

      console.log(`Attempting to send WhatsApp message via GET to: ${finalApiUrl}`);

      const response = await fetch(url, {
        method: 'GET',
      });
      
      const responseText = await response.text();

      if (response.ok) {
        // The API might return a non-JSON success message or simple string.
        // We'll optimistically consider any 2xx response a success.
        console.log(`Successfully sent WhatsApp message. Status: ${response.status}. Response:`, responseText);
        let messageId = 'N/A';
        try {
            const responseData = JSON.parse(responseText);
            messageId = responseData.message_id || responseData.id || 'N/A';
        } catch (e) {
            // Ignore JSON parsing errors on success, as the response might be plain text
        }
        return { success: true, messageId: messageId };
      } else {
        // If the response is not OK, try to parse for an error message.
        let apiError = `API returned status ${response.status}`;
        try {
            const responseData = JSON.parse(responseText);
            apiError = responseData.error || responseData.message || `API returned status '${responseData.status}'`;
        } catch (e) {
            // If JSON parsing fails, use the raw text.
            apiError = `API returned status ${response.status}. Response: ${responseText.substring(0, 200)}...`
        }
        console.error('Failed to send WhatsApp message. API Response:', responseText);
        return { success: false, error: `API Error: ${apiError}` };
      }

    } catch (error) {
      console.error('An unexpected network or fetch error occurred in sendWhatsappMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred while sending the message.';
      return { success: false, error: `Network/Fetch Error: ${errorMessage}` };
    }
  }
);
