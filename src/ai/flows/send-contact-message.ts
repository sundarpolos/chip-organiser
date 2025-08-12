
'use server';

/**
 * @fileOverview A flow for sending a contact form submission to the Super Admin via WhatsApp.
 *
 * - sendContactMessage - A function that formats and sends the contact message.
 * - SendContactMessageInput - The input type for the function.
 * - SendContactMessageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SUPER_ADMIN_WHATSAPP = '919843350000'; // The Super Admin's WhatsApp number

const SendContactMessageInputSchema = z.object({
  name: z.string().describe('The name of the person sending the message.'),
  email: z.string().email().describe('The email address of the sender.'),
  subject: z.string().describe('The subject of the message.'),
  reason: z.string().describe('The reason for contacting.'),
  message: z.string().describe('The content of the message.'),
});
export type SendContactMessageInput = z.infer<typeof SendContactMessageInputSchema>;

const SendContactMessageOutputSchema = z.object({
  success: z.boolean().describe('Whether the message was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendContactMessageOutput = z.infer<typeof SendContactMessageOutputSchema>;

export async function sendContactMessage(input: SendContactMessageInput): Promise<SendContactMessageOutput> {
  return sendContactMessageFlow(input);
}

const sendContactMessageFlow = ai.defineFlow(
  {
    name: 'sendContactMessageFlow',
    inputSchema: SendContactMessageInputSchema,
    outputSchema: SendContactMessageOutputSchema,
  },
  async ({ name, email, subject, reason, message }) => {
    try {
      // Format the message for WhatsApp
      const whatsappMessage = `*New Contact Form Submission*

*Name:* ${name}
*Email:* ${email}
*Reason:* ${reason}
*Subject:* ${subject}

*Message:*
${message}`;

      const whatsappPayload: SendWhatsappMessageInput = {
        to: SUPER_ADMIN_WHATSAPP,
        message: whatsappMessage,
        // Using environment variables for credentials by default
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        return { success: true };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.' };
      }
    } catch (error) {
      console.error('Error in sendContactMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
