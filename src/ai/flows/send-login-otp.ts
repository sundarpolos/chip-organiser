

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
  isNewUser: z.boolean().describe('Whether a new user was created.'),
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
      const allPlayers = await getMasterPlayers();
      let user = allPlayers.find(p => p.whatsappNumber === whatsappNumber);
      let isNewUser = false;
      const isSuperAdminLogin = whatsappNumber === SUPER_ADMIN_WHATSAPP;

      if (!user) {
        // Create a new user if not found
        let newUserPayload: Omit<import('@/lib/types').MasterPlayer, 'id'> = {
          name: isSuperAdminLogin ? 'Sundar' : `Player ${whatsappNumber.slice(-4)}`, // Default name
          whatsappNumber: whatsappNumber,
          isAdmin: isSuperAdminLogin, // Only super admin is admin on creation
          isBanker: isSuperAdminLogin, // Super admin is also a banker
          isActive: true, // New users are active by default
        };
        user = await saveMasterPlayer(newUserPayload);
        isNewUser = true;
      } else if (isSuperAdminLogin && (!user.isAdmin || !user.isBanker)) {
        // If the super admin logs in and isn't admin/banker, make them so.
        user.isAdmin = true;
        user.isBanker = true;
        await saveMasterPlayer(user);
      } else if (!isSuperAdminLogin && user.name === 'Sundar' && user.whatsappNumber !== SUPER_ADMIN_WHATSAPP) {
        // Edge case: demote a user named Sundar who is not the super admin.
        user.isAdmin = false;
        await saveMasterPlayer(user);
      }


      const otp = generateOtp();
      const message = `Your Smart Club Organiser login code is ${otp}. This code will expire in 10 minutes.`;

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
        return { success: true, otp: otp, isNewUser };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.', isNewUser: false };
      }
    } catch (error) {
      console.error('Error in sendLoginOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage, isNewUser: false };
    }
  }
);
