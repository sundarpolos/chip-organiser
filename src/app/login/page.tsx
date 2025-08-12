
'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { sendLoginOtp } from '@/ai/flows/send-login-otp';
import { findUserByWhatsapp } from '@/services/player-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import type { MasterPlayer } from '@/lib/types';

function LoginPageContent() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    const tenDigitRegex = /^\d{10}$/;
    const fullNumberRegex = /^\d{11,15}$/;

    if (!whatsappNumber) {
        toast({
            variant: 'destructive',
            title: 'Invalid Number',
            description: 'Please enter a valid WhatsApp number.',
        });
        return;
    }

    if (tenDigitRegex.test(whatsappNumber)) {
      toast({
        variant: 'destructive',
        title: 'Country Code Required',
        description: 'Please include your country code with your mobile number (e.g., 919876543210).',
      });
      return;
    }
    
    if (!fullNumberRegex.test(whatsappNumber)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Please enter a valid WhatsApp number including the country code (11-15 digits).',
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
      const user = await findUserByWhatsapp(whatsappNumber);

      if (user && user.clubId) {
        localStorage.setItem('chip-maestro-user', JSON.stringify(user));
        localStorage.setItem('chip-maestro-clubId', user.clubId);
        router.replace('/dashboard');
      } else {
        // This case should ideally not be hit if sendLoginOtp is working correctly, but it's a good fallback.
        throw new Error("This WhatsApp number isn't registered with any club. Please contact your admin.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOtpSent) {
        handleLogin();
      } else {
        handleSendOtp();
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-20"
      >
        <source src="https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-background/80 backdrop-blur-sm -z-10" />
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Chip Maestro Login</CardTitle>
          <CardDescription>
            {isOtpSent ? `Enter the OTP sent to ${whatsappNumber}.` : 'Enter your WhatsApp number to log in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOtpSent ? (
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="sr-only">WhatsApp Number</Label>
              <Input
                id="whatsapp-number"
                type="tel"
                placeholder="e.g. 919876543210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otp" className="sr-only">One-Time Password (OTP)</Label>
              <Input
                id="otp"
                type="text"
                placeholder="4-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!isOtpSent ? (
            <Button onClick={handleSendOtp} disabled={isSending || !whatsappNumber} className="w-full">
              {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
            </Button>
          ) : (
            <>
              <Button onClick={handleLogin} disabled={isVerifying || !otp} className="w-full">
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
