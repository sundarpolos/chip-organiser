
'use server';

/**
 * @fileOverview A flow for sending web push notifications.
 *
 * - sendPushNotification - A function that sends a message to multiple push subscribers.
 * - SendPushNotificationInput - The input type for the function.
 * - SendPushNotificationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import webpush, { type PushSubscription } from 'web-push';

const SendPushNotificationInputSchema = z.object({
  message: z.string().describe('The message content to send.'),
  subscriptions: z.array(z.custom<PushSubscription>()).describe('An array of push subscription objects.'),
});
export type SendPushNotificationInput = z.infer<typeof SendPushNotificationInputSchema>;

const SendPushNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the notifications were sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendPushNotificationOutput = z.infer<typeof SendPushNotificationOutputSchema>;


export async function sendPushNotification(input: SendPushNotificationInput): Promise<SendPushNotificationOutput> {
  return sendPushNotificationFlow(input);
}

const sendPushNotificationFlow = ai.defineFlow(
  {
    name: 'sendPushNotificationFlow',
    inputSchema: SendPushNotificationInputSchema,
    outputSchema: SendPushNotificationOutputSchema,
  },
  async ({ message, subscriptions }) => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      const errorMsg = 'VAPID keys are not configured on the server.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    webpush.setVapidDetails(
      'mailto:admin@your-domain.com', // Replace with your admin email
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: 'Chip Maestro',
      body: message,
      icon: '/icons/icon-192x192.png',
    });

    try {
      const sendPromises = subscriptions.map(subscription =>
        webpush.sendNotification(subscription, payload).catch(err => {
          console.error(`Failed to send notification to endpoint: ${subscription.endpoint}`, err);
          // Return a specific error object for failed sends
          return { error: err, endpoint: subscription.endpoint };
        })
      );
      
      const results = await Promise.all(sendPromises);
      
      const failedSends = results.filter(r => r && 'error' in r);

      if (failedSends.length > 0) {
        console.error(`${failedSends.length} out of ${subscriptions.length} push notifications failed.`);
        return { success: false, error: `${failedSends.length} notifications failed.` };
      }

      return { success: true };
    } catch (error) {
      console.error('An unexpected error occurred in sendPushNotificationFlow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: errorMessage };
    }
  }
);
