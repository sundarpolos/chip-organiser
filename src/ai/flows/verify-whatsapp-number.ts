'use server';

/**
 * @fileOverview A flow for verifying if a phone number is on WhatsApp.
 *
 * - verifyWhatsappNumber - A function that checks a number using an external API.
 * - VerifyWhatsappNumberInput - The input type for the function.
 * - VerifyWhatsappNumberOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VERIFY_API_URL = 'https://api.wazoneindia.com/isonwa';
// NOTE: This token is from the user's example. It should be moved to an environment variable in a production setup.
const VERIFY_API_TOKEN = 'iqlTxsOgOBqTp6fgegm5';

const VerifyWhatsappNumberInputSchema = z.object({
  whatsappNumber: z.string().describe('The WhatsApp number to verify.'),
});
export type VerifyWhatsappNumberInput = z.infer<typeof VerifyWhatsappNumberInputSchema>;

const VerifyWhatsappNumberOutputSchema = z.object({
  success: z.boolean().describe('Whether the API call was successful.'),
  isOnWhatsApp: z.boolean().describe('Whether the number is registered on WhatsApp.'),
  error: z.string().optional().describe('Error message if the verification failed.'),
});
export type VerifyWhatsappNumberOutput = z.infer<typeof VerifyWhatsappNumberOutputSchema>;

export async function verifyWhatsappNumber(input: VerifyWhatsappNumberInput): Promise<VerifyWhatsappNumberOutput> {
  return verifyWhatsappNumberFlow(input);
}

const verifyWhatsappNumberFlow = ai.defineFlow(
  {
    name: 'verifyWhatsappNumberFlow',
    inputSchema: VerifyWhatsappNumberInputSchema,
    outputSchema: VerifyWhatsappNumberOutputSchema,
  },
  async ({ whatsappNumber }) => {
    try {
      const url = `${VERIFY_API_URL}?receiver=${whatsappNumber}&token=${VERIFY_API_TOKEN}`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === true) {
        return { success: true, isOnWhatsApp: data.isonwa === true };
      } else {
        return { success: false, isOnWhatsApp: false, error: 'API returned a non-success response.' };
      }
    } catch (error) {
      console.error('Error in verifyWhatsappNumberFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, isOnWhatsApp: false, error: errorMessage };
    }
  }
);
