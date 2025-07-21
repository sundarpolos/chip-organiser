'use server';

/**
 * @fileOverview A flow for sending an OTP to the Super Admin to verify player deletion.
 *
 * - sendDeletePlayerOtp - A function that generates an OTP and sends it to the Super Admin.
 * - SendDeletePlayerOtpInput - The input type for the function.
 * - SendDeletePlayerOtpOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const SendDeletePlayerOtpInputSchema = z.object({
  playerToDeleteName: z.string().describe('The name of the player being deleted.'),
  whatsappConfig: z.object({
    apiUrl: z.string().optional(),
    apiToken: z.string().optional(),
    senderMobile: z.string().optional(),
  }).describe('WhatsApp API credentials.'),
});
export type SendDeletePlayerOtpInput = z.infer<typeof SendDeletePlayerOtpInputSchema>;

const SendDeletePlayerOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 6-digit OTP that was sent. This is returned for verification.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendDeletePlayerOtpOutput = z.infer<typeof SendDeletePlayerOtpOutputSchema>;

// Helper function to generate a random 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendDeletePlayerOtp(input: SendDeletePlayerOtpInput): Promise<SendDeletePlayerOtpOutput> {
  return sendDeletePlayerOtpFlow(input);
}

const sendDeletePlayerOtpFlow = ai.defineFlow(
  {
    name: 'sendDeletePlayerOtpFlow',
    inputSchema: SendDeletePlayerOtpInputSchema,
    outputSchema: SendDeletePlayerOtpOutputSchema,
  },
  async ({ playerToDeleteName, whatsappConfig }) => {
    try {
      const otp = generateOtp();
      const message = `OTP to delete player "${playerToDeleteName}" is ${otp}. This is a critical action.`;

      const whatsappPayload: SendWhatsappMessageInput = {
        to: SUPER_ADMIN_WHATSAPP,
        message,
        ...whatsappConfig
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        return { success: true, otp: otp };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.' };
      }
    } catch (error) {
      console.error('Error in sendDeletePlayerOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
