import { config } from 'dotenv';
config();

import '@/ai/flows/detect-anomalies.ts';
import '@/ai/flows/send-whatsapp-message.ts';
import '@/ai/flows/send-buyin-otp.ts';
import '@/ai/flows/import-game.ts';
import '@/ai/flows/send-login-otp.ts';
import '@/ai/flows/send-delete-player-otp.ts';
import '@/ai/flows/send-delete-game-otp.ts';
import '@/ai/flows/send-contact-message.ts';
import '@/ai/flows/verify-whatsapp-number.ts';
import '@/ai/flows/send-welcome-message.ts';
import '@/ai/flows/send-booking-otp.ts';
import '@/ai/flows/generate-poker-reminder.ts';
import '@/ai/flows/send-delete-online-account-otp.ts';
