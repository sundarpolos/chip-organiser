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

    if (!finalApiToken || !finalApiUrl || !finalSenderMobile) {
      const errorMsg = 'WhatsApp API credentials are not fully configured. Please provide them in the WA Settings or in the .env file.';
      console.error(errorMsg);
      return { success: false, error: `Server configuration error: ${errorMsg}` };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('receiver', to);
      formData.append('msgtext', message);
      formData.append('token', finalApiToken);
      
      const response = await fetch(finalApiUrl, {
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
        console.error(`Failed to parse API response as JSON. Status: ${response.status}. Raw response:`, responseText);
        return { success: false, error: `Received an invalid or non-JSON response from the API. Status: ${response.status}. Check API provider docs. Response: ${responseText.substring(0, 100)}...` };
      }
      
      if (!response.ok || String(responseData.success).toLowerCase() !== 'true') {
        const apiError = responseData.error || responseData.message || `API returned status ${response.status} with 'success: false'`;
        console.error('Failed to send WhatsApp message. API Response:', JSON.stringify(responseData, null, 2));
        return { success: false, error: `API Error: ${apiError}` };
      }
      
      console.log('Successfully sent WhatsApp message. API Response:', JSON.stringify(responseData, null, 2));
      return { success: true, messageId: responseData.message_id || responseData.messageId || 'N/A' };

    } catch (error) {
      console.error('An unexpected network or fetch error occurred in sendWhatsappMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred while sending the message.';
      return { success: false, error: `Network/Fetch Error: ${errorMessage}` };
    }
  }
);
