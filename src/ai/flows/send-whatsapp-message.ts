
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

    if (!finalApiToken || !finalApiUrl) {
      const errorMsg = 'WhatsApp API URL and Token are not configured. Please provide them in the WA Settings or in the .env file.';
      console.error(errorMsg);
      return { success: false, error: `Server configuration error: ${errorMsg}` };
    }

    try {
      // Construct the URL with query parameters for a GET request
      const params = new URLSearchParams({
        token: finalApiToken,
        receiver: to,
        msgtext: message,
      });
      // The sender parameter might also be needed, depending on the API
      if (finalSenderMobile) {
        params.append('sender', finalSenderMobile);
      }
      
      const url = `${finalApiUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET', // Use GET as per the PHP example
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        // If parsing fails, check if the request was still successful
        if (response.ok) {
          console.log(`Successfully sent WhatsApp message. Status: ${response.status}. Non-JSON response:`, responseText);
          return { success: true, messageId: 'N/A - Non-JSON response' };
        }
        console.error(`Failed to parse API response as JSON. Status: ${response.status}. Raw response:`, responseText);
        return { success: false, error: `Received an invalid or non-JSON response from the API. Status: ${response.status}. Response: ${responseText.substring(0, 150)}...` };
      }
      
      if (response.ok && (responseData.status === 'success' || responseData.success === true)) {
        console.log('Successfully sent WhatsApp message. API Response:', JSON.stringify(responseData, null, 2));
        return { success: true, messageId: responseData.message_id || responseData.id || 'N/A' };
      } else {
        const apiError = responseData.error || responseData.message || `API returned status '${responseData.status}'`;
        console.error('Failed to send WhatsApp message. API Response:', JSON.stringify(responseData, null, 2));
        return { success: false, error: `API Error: ${apiError}` };
      }

    } catch (error) {
      console.error('An unexpected network or fetch error occurred in sendWhatsappMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred while sending the message.';
      return { success: false, error: `Network/Fetch Error: ${errorMessage}` };
    }
  }
);
