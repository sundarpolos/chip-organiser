
'use server';

/**
 * @fileOverview A flow for handling user login/signup via WhatsApp OTP.
 *
 * - sendLoginOtp - A function that handles user lookup/creation and sends an OTP.
 * - SendLoginOtpInput - The input type for the sendLoginotp function.
 * - SendLoginOtpOutput - The return type for the sendLoginOtp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findUserByWhatsapp } from '@/services/player-service';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';
import { getClub } from '@/services/club-service';
import { verifyWhatsappNumber } from './verify-whatsapp-number';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const SendLoginOtpInputSchema = z.object({
  whatsappNumber: z.string().describe("The user's WhatsApp number, including country code."),
});
export type SendLoginOtpInput = z.infer<typeof SendLoginOtpInputSchema>;

const SendLoginOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification.'),
  error: z.string().optional().describe('Error message if sending failed.'),
  isSuperAdmin: z.boolean().describe('Whether the login attempt is for the super admin.'),
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
  async ({ whatsappNumber }) => {
    try {
      const whatsappRegex = /^\d{1,5}\d{10}$/; // Country code (1-5 digits) + 10-digit number
      if (!whatsappRegex.test(whatsappNumber)) {
        return { success: false, error: 'Invalid WhatsApp number format. Please use country code + 10-digit number without "+".', isSuperAdmin: false };
      }

      const isSuperAdminLogin = whatsappNumber === SUPER_ADMIN_WHATSAPP;

      // 1. Find the user and their associated club
      const user = await findUserByWhatsapp(whatsappNumber);
      if (!user || !user.clubId) {
        return { success: false, error: 'This WhatsApp number is not registered with any club. Please contact your admin.', isSuperAdmin: false };
      }

      // 2. Fetch the club's WhatsApp configuration
      const club = await getClub(user.clubId);
      if (!club) {
        return { success: false, error: 'Could not find the club associated with your account.', isSuperAdmin: false };
      }

      // 3. Verify number is on whatsapp (skip for super admin to allow fallback)
      if (!isSuperAdminLogin) {
          const verificationResult = await verifyWhatsappNumber({ whatsappNumber });
          if (!verificationResult.isOnWhatsApp) {
              return { success: false, error: verificationResult.error || "This number does not appear to be on WhatsApp.", isSuperAdmin: false };
          }
      }

      const otp = generateOtp();
      const message = `Your Chip Maestro login code is ${otp}. This code will expire in 10 minutes.`;

      // 4. Construct payload with club-specific credentials
      const whatsappPayload: SendWhatsappMessageInput = {
        to: whatsappNumber,
        message,
        apiUrl: club.whatsappConfig?.apiUrl,
        apiToken: club.whatsappConfig?.apiToken,
        senderMobile: club.whatsappConfig?.senderMobile,
      };

      // 5. Send the message
      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        return { success: true, otp: otp, isSuperAdmin: isSuperAdminLogin };
      } else {
        // If sending fails, return the error but also indicate if it was a super admin
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.', isSuperAdmin: isSuperAdminLogin };
      }
    } catch (error) {
      console.error('Error in sendLoginOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage, isSuperAdmin: whatsappNumber === SUPER_ADMIN_WHATSAPP };
    }
  }
);
