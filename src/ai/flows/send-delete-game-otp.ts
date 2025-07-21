'use server';

/**
 * @fileOverview A flow for sending an OTP to the Super Admin to verify game deletion.
 *
 * - sendDeleteGameOtp - A function that generates an OTP and sends it to the Super Admin.
 * - SendDeleteGameOtpInput - The input type for the function.
 * - SendDeleteGameOtpOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const SendDeleteGameOtpInputSchema = z.object({
  gameVenue: z.string().describe('The venue of the game being deleted.'),
  gameDate: z.string().describe('The date of the game being deleted.'),
  whatsappConfig: z.object({
    apiUrl: z.string().optional(),
    apiToken: z.string().optional(),
    senderMobile: z.string().optional(),
  }).describe('WhatsApp API credentials.'),
});
export type SendDeleteGameOtpInput = z.infer<typeof SendDeleteGameOtpInputSchema>;

const SendDeleteGameOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendDeleteGameOtpOutput = z.infer<typeof SendDeleteGameOtpOutputSchema>;

// Helper function to generate a random 4-digit OTP
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendDeleteGameOtp(input: SendDeleteGameOtpInput): Promise<SendDeleteGameOtpOutput> {
  return sendDeleteGameOtpFlow(input);
}

const sendDeleteGameOtpFlow = ai.defineFlow(
  {
    name: 'sendDeleteGameOtpFlow',
    inputSchema: SendDeleteGameOtpInputSchema,
    outputSchema: SendDeleteGameOtpOutputSchema,
  },
  async ({ gameVenue, gameDate, whatsappConfig }) => {
    try {
      const otp = generateOtp();
      const message = `OTP to delete game at "${gameVenue}" from ${gameDate} is ${otp}. This action cannot be undone.`;

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
      console.error('Error in sendDeleteGameOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
