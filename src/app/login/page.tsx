'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendLoginOtp } from '@/ai/flows/send-login-otp';
import { getMasterPlayers } from '@/services/player-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    const numberRegex = /^\d{10,15}$/;
    if (!numberRegex.test(whatsappNumber)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Please enter a valid WhatsApp number with country code (e.g., 919876543210).',
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendLoginOtp({ whatsappNumber, whatsappConfig: {} });
      if (result.success && result.otp) {
        setSentOtp(result.otp);
        setIsOtpSent(true);
        toast({
          title: 'OTP Sent!',
          description: `An OTP has been sent to ${whatsappNumber}.`,
        });
      } else {
        throw new Error(result.error || 'An unknown error occurred while sending OTP.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async () => {
    if (otp !== sentOtp) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'The OTP you entered is incorrect. Please try again.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      // On successful OTP verification, fetch the user's details
      const allPlayers = await getMasterPlayers();
      const currentUser = allPlayers.find(p => p.whatsappNumber === whatsappNumber);

      if (currentUser) {
        // Store user details in localStorage to simulate a session
        localStorage.setItem('chip-maestro-user', JSON.stringify(currentUser));
        router.replace('/dashboard');
      } else {
         throw new Error("Could not find user profile after login. Please try again.");
      }
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message
        })
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
            </div>
          <CardTitle>Chip Maestro Login</CardTitle>
          <CardDescription>
            {isOtpSent ? 'Enter the OTP sent to your WhatsApp.' : 'Enter your WhatsApp number to receive an OTP.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOtpSent ? (
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
              <Input
                id="whatsapp-number"
                type="tel"
                placeholder="e.g., 919876543210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input
                id="otp"
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!isOtpSent ? (
            <Button onClick={handleSendOtp} disabled={isSending} className="w-full">
              {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
            </Button>
          ) : (
            <>
              <Button onClick={handleLogin} disabled={isVerifying} className="w-full">
                {isVerifying ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
              <Button variant="link" onClick={() => setIsOtpSent(false)}>
                Use a different number
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
