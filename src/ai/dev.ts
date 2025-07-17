import { config } from 'dotenv';
config();

import '@/ai/flows/detect-anomalies.ts';
import '@/ai/flows/send-whatsapp-message.ts';
