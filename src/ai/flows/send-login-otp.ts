



'use server';

/**
 * @fileOverview A flow for handling user login/signup via WhatsApp OTP.
 *
 * - sendLoginOtp - A function that handles user lookup/creation and sends an OTP.
 * - SendLoginOtpInput - The input type for the sendLoginOtp function.
 * - SendLoginOtpOutput - The return type for the sendLoginOtp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getMasterPlayers, saveMasterPlayer } from '@/services/player-service';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const SendLoginOtpInputSchema = z.object({
  whatsappNumber: z.string().describe("The user's WhatsApp number, including country code."),
  whatsappConfig: z.object({
    apiUrl: z.string().optional(),
    apiToken: z.string().optional(),
    senderMobile: z.string().optional(),
  }).describe('WhatsApp API credentials.'),
});
export type SendLoginOtpInput = z.infer<typeof SendLoginOtpInputSchema>;

const SendLoginOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendLoginOtpOutput = z.infer<typeof SendLoginOtpOutputSchema>;

// Helper function to generate a random 4-digit OTP
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendLoginOtp(input: SendLoginOtpInput): Promise<SendLoginOtpOutput> {
  return sendLoginOtpFlow(input);
}

const sendLoginOtpFlow = ai.defineFlow(
  {
    name: 'sendLoginOtpFlow',
    inputSchema: SendLoginOtpInputSchema,
    outputSchema: SendLoginOtpOutputSchema,
  },
  async ({ whatsappNumber, whatsappConfig }) => {
    try {
      const whatsappRegex = /^\d{1,5}\d{10}$/; // Country code (1-5 digits) + 10-digit number
      if (!whatsappRegex.test(whatsappNumber)) {
        return { success: false, error: 'Invalid WhatsApp number format. Please use country code + 10-digit number without "+".' };
      }

      const allPlayers = await getMasterPlayers();
      let user = allPlayers.find(p => p.whatsappNumber === whatsappNumber);
      const isSuperAdminLogin = whatsappNumber === SUPER_ADMIN_WHATSAPP;

      if (!user) {
        // If user is not found, do not create a new one. Return an error.
        return { success: false, error: 'This WhatsApp number is not registered. Please contact your club admin.' };
      }

      if (isSuperAdminLogin && (!user.isAdmin)) {
        // If the super admin logs in and isn't admin, make them so.
        user.isAdmin = true;
        await saveMasterPlayer(user);
      } else if (!isSuperAdminLogin && user.name === 'Sundar' && user.whatsappNumber !== SUPER_ADMIN_WHATSAPP) {
        // Edge case: demote a user named Sundar who is not the super admin.
        user.isAdmin = false;
        await saveMasterPlayer(user);
      }

      const otp = generateOtp();
      const message = `Your Chip Maestro login code is ${otp}. This code will expire in 10 minutes.`;

      const whatsappPayload: SendWhatsappMessageInput = {
        to: whatsappNumber,
        message,
        ...whatsappConfig
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        // In a real application, you would not return the OTP to the client.
        // This is done for prototype simplicity. The OTP would be stored
        // server-side (e.g., in Firestore with an expiry) and verified in a separate step.
        return { success: true, otp: otp };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.' };
      }
    } catch (error) {
      console.error('Error in sendLoginOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
