
'use server';

/**
 * @fileOverview A flow for generating and sending a seat booking confirmation OTP via WhatsApp.
 *
 * - sendBookingOtp - A function that generates a 4-digit OTP and sends it to a player.
 * - SendBookingOtpInput - The input type for the sendBookingOtp function.
 * - SendBookingOtpOutput - The return type for the sendBookingOtp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage, type SendWhatsappMessageInput } from './send-whatsapp-message';
import { getClub } from '@/services/club-service';

const SendBookingOtpInputSchema = z.object({
  playerName: z.string().describe('The name of the player.'),
  whatsappNumber: z.string().describe("The player's WhatsApp number."),
  gameDate: z.string().describe('The date of the game being booked (e.g., "July 28, 2024").'),
  clubId: z.string().describe('The ID of the club the game belongs to.'),
});
export type SendBookingOtpInput = z.infer<typeof SendBookingOtpInputSchema>;

const SendBookingOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification purposes.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendBookingOtpOutput = z.infer<typeof SendBookingOtpOutputSchema>;

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendBookingOtp(input: SendBookingOtpInput): Promise<SendBookingOtpOutput> {
  return sendBookingOtpFlow(input);
}

const sendBookingOtpFlow = ai.defineFlow(
  {
    name: 'sendBookingOtpFlow',
    inputSchema: SendBookingOtpInputSchema,
    outputSchema: SendBookingOtpOutputSchema,
  },
  async ({ playerName, whatsappNumber, gameDate, clubId }) => {
    if (!whatsappNumber) {
      return { success: false, error: 'WhatsApp number is not provided.' };
    }
    
    try {
      const club = await getClub(clubId);
      if (!club) {
        return { success: false, error: `Club with ID ${clubId} not found.` };
      }

      const otp = generateOtp();
      const message = `Hi ${playerName}, your seat booking confirmation code for the game on ${gameDate} is ${otp}.`;
      
      const config = club.whatsappConfig || {};
      const whatsappPayload: SendWhatsappMessageInput = {
        to: whatsappNumber,
        message,
        apiUrl: config.apiUrl,
        apiToken: config.apiToken,
        senderMobile: config.senderMobile,
      };

      const whatsappResult = await sendWhatsappMessage(whatsappPayload);
      
      if (whatsappResult.success) {
        return { success: true, otp: otp };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message for booking.' };
      }
    } catch (error) {
      console.error('Error in sendBookingOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
