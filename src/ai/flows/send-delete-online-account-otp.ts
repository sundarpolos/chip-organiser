'use server';

/**
 * @fileOverview A flow for sending an OTP to the Super Admin to verify online player account deletion.
 *
 * - sendDeleteOnlineAccountOtp - A function that generates an OTP and sends it to the Super Admin.
 * - SendDeleteOnlineAccountOtpInput - The input type for the function.
 * - SendDeleteOnlineAccountOtpOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const SendDeleteOnlineAccountOtpInputSchema = z.object({
  playerName: z.string().describe('The name of the player whose online account is being deleted.'),
  clubName: z.string().describe('The name of the club the player belongs to.'),
});
export type SendDeleteOnlineAccountOtpInput = z.infer<typeof SendDeleteOnlineAccountOtpInputSchema>;

const SendDeleteOnlineAccountOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendDeleteOnlineAccountOtpOutput = z.infer<typeof SendDeleteOnlineAccountOtpOutputSchema>;

// Helper function to generate a random 4-digit OTP
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendDeleteOnlineAccountOtp(input: SendDeleteOnlineAccountOtpInput): Promise<SendDeleteOnlineAccountOtpOutput> {
  return sendDeleteOnlineAccountOtpFlow(input);
}

const sendDeleteOnlineAccountOtpFlow = ai.defineFlow(
  {
    name: 'sendDeleteOnlineAccountOtpFlow',
    inputSchema: SendDeleteOnlineAccountOtpInputSchema,
    outputSchema: SendDeleteOnlineAccountOtpOutputSchema,
  },
  async ({ playerName, clubName }) => {
    try {
      const otp = generateOtp();
      const message = `OTP to delete online account for "${playerName}" in club "${clubName}" is ${otp}. This action is critical and will erase their online ledger.`;

      const whatsappPayload: SendWhatsappMessageInput = {
        to: SUPER_ADMIN_WHATSAPP,
        message,
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        return { success: true, otp: otp };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.' };
      }
    } catch (error) {
      console.error('Error in sendDeleteOnlineAccountOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
