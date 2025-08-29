
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
  whatsappNumber: z.string().describe("The sender's WhatsApp number."),
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
  async ({ name, whatsappNumber, subject, reason, message }) => {
    try {
      // 1. Format and send the message to the Super Admin
      const adminMessage = `*New Contact Form Submission*

*Name:* ${name}
*WhatsApp:* ${whatsappNumber}
*Reason:* ${reason}
*Subject:* ${subject}

*Message:*
${message}`;

      const adminPayload: SendWhatsappMessageInput = {
        to: SUPER_ADMIN_WHATSAPP,
        message: adminMessage,
      };

      const adminResult = await sendWhatsappMessage(adminPayload);
      
      if (!adminResult.success) {
        return { success: false, error: adminResult.error || 'Failed to send message to admin.' };
      }

      // 2. Format and send a confirmation copy to the user
      const userMessage = `Hi ${name},

Thank you for contacting Chip Maestro! We have received your message and will get back to you shortly.

Here is a copy of your submission:
---
*Reason:* ${reason}
*Subject:* ${subject}

*Message:*
${message}
---`;

      const userPayload: SendWhatsappMessageInput = {
        to: whatsappNumber,
        message: userMessage,
      };
      
      // We send the user copy but don't fail the whole operation if it doesn't succeed.
      // The primary goal is getting the message to the admin.
      await sendWhatsappMessage(userPayload);

      return { success: true };

    } catch (error) {
      console.error('Error in sendContactMessageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
