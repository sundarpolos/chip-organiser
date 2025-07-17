'use server';

/**
 * @fileOverview A flow for generating and sending a buy-in verification OTP via WhatsApp.
 *
 * - sendBuyInOtp - A function that generates a 4-digit OTP and sends it to a player.
 * - SendBuyInOtpInput - The input type for the sendBuyInOtp function.
 * - SendBuyInOtpOutput - The return type for the sendBuyInOtp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendWhatsappMessage } from './send-whatsapp-message';

const SendBuyInOtpInputSchema = z.object({
  playerName: z.string().describe('The name of the player.'),
  whatsappNumber: z.string().describe("The player's WhatsApp number."),
  buyInAmount: z.number().describe('The buy-in amount to be verified.'),
  buyInCount: z.number().describe('The number of this buy-in for the player (e.g., 1 for 1st).'),
  totalBuyInAmount: z.number().describe("The player's total verified buy-in amount so far."),
});
export type SendBuyInOtpInput = z.infer<typeof SendBuyInOtpInputSchema>;

const SendBuyInOtpOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP was sent successfully.'),
  otp: z.string().optional().describe('The 4-digit OTP that was sent. This is returned for verification purposes.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendBuyInOtpOutput = z.infer<typeof SendBuyInOtpOutputSchema>;

// Helper function to generate a random 4-digit OTP
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function sendBuyInOtp(input: SendBuyInOtpInput): Promise<SendBuyInOtpOutput> {
  return sendBuyInOtpFlow(input);
}

const sendBuyInOtpFlow = ai.defineFlow(
  {
    name: 'sendBuyInOtpFlow',
    inputSchema: SendBuyInOtpInputSchema,
    outputSchema: SendBuyInOtpOutputSchema,
  },
  async ({ playerName, whatsappNumber, buyInAmount, buyInCount, totalBuyInAmount }) => {
    if (!whatsappNumber) {
        return { success: false, error: 'WhatsApp number is not provided.' };
    }

    const otp = generateOtp();
    const newTotal = totalBuyInAmount + buyInAmount;
    const message = `Hi ${playerName}, your OTP is ${otp} for your ${getOrdinalSuffix(buyInCount)} buy-in.
Amount: ₹${buyInAmount}
Previous Total: ₹${totalBuyInAmount}
After verification, your new grand total will be ₹${newTotal}.`;

    try {
      const whatsappResult = await sendWhatsappMessage({ to: whatsappNumber, message });
      
      if (whatsappResult.success) {
        // In a real application, you wouldn't return the OTP to the client.
        // It's done here for simplicity of the prototype.
        return { success: true, otp: otp };
      } else {
        return { success: false, error: whatsappResult.error || 'Failed to send WhatsApp message.' };
      }
    } catch (error) {
      console.error('Error in sendBuyInOtpFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
