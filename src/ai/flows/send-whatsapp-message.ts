
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
  to: z.string().describe('The recipient WhatsApp number or group ID.'),
  message: z.string().describe('The message content to send.'),
  isGroup: z.boolean().optional().describe('Set to true if sending to a group ID.'),
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
  async ({ to, message, isGroup = false, apiUrl, apiToken, senderMobile }) => {
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
      const body = new URLSearchParams({
        msgtext: message,
        token: finalApiToken,
      });

      if (finalSenderMobile) {
        body.append('sender', finalSenderMobile);
      }

      if (isGroup) {
        // For group messages, 'to' is the group ID.
        // The API seems to use the 'group' param for the ID and also expects it as 'receiver'
        body.append('group', to);
        body.append('receiver', to); 
      } else {
        body.append('receiver', to);
      }

      console.log(`Attempting to send WhatsApp message via POST to: ${finalApiUrl}`);
      
      const response = await fetch(finalApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });
      
      const responseText = await response.text();

      if (response.ok) {
        try {
          const responseData = JSON.parse(responseText);
          // According to the provided PHP logic, success is determined by the absence of an 'error' key.
          if (responseData.error === undefined) {
            console.log(`Successfully sent WhatsApp message. Status: ${response.status}. Response:`, responseText);
            return { success: true, messageId: responseData.message_id || 'N/A' };
          } else {
            // The API returned a 200 OK status but included an error field in the JSON.
            console.error('API indicated failure with an error key. API Response:', responseText);
            return { success: false, error: `API Error: ${responseData.error}` };
          }
        } catch (e) {
           // This case handles non-JSON success responses, like "OK" or just a string.
           // If we get here, it means the request was successful (response.ok is true), but the body wasn't valid JSON.
           // We can treat this as a success, as some APIs might respond this way.
          console.log(`Successfully sent WhatsApp message with non-JSON response. Status: ${response.status}. Response:`, responseText);
          return { success: true, messageId: 'N/A' };
        }
      } else {
        let apiError = `API returned status ${response.status}`;
        try {
            const responseData = JSON.parse(responseText);
            apiError = responseData.error || responseData.message || `API returned status '${responseData.status}'`;
        } catch (e) {
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
