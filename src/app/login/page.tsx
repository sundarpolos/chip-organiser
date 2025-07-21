
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendLoginOtp } from '@/ai/flows/send-login-otp';
import { getMasterPlayers } from '@/services/player-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MasterPlayer } from '@/lib/types';

export default function LoginPage() {
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function loadPlayers() {
      try {
        const players = await getMasterPlayers();
        setMasterPlayers(players);
      } catch (error) {
        console.error("Failed to load players", error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Players',
          description: 'Could not fetch the list of registered players. Please try again.',
        });
      } finally {
        setIsLoadingPlayers(false);
      }
    }
    loadPlayers();
  }, [toast]);

  const handleSendOtp = async () => {
    const selectedPlayer = masterPlayers.find(p => p.id === selectedPlayerId);
    if (!selectedPlayer || !selectedPlayer.whatsappNumber) {
      toast({
        variant: 'destructive',
        title: 'Invalid Player',
        description: 'Please select a valid player with a registered WhatsApp number.',
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendLoginOtp({ whatsappNumber: selectedPlayer.whatsappNumber, whatsappConfig: {} });
      if (result.success && result.otp) {
        setSentOtp(result.otp);
        setIsOtpSent(true);
        toast({
          title: 'OTP Sent!',
          description: `An OTP has been sent to ${selectedPlayer.name}'s registered number.`,
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
      // On successful OTP verification, the selected player is the current user
      const currentUser = masterPlayers.find(p => p.id === selectedPlayerId);

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

  const selectedPlayer = masterPlayers.find(p => p.id === selectedPlayerId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
            </div>
          <CardTitle>Chip Maestro Login</CardTitle>
          <CardDescription>
            {isOtpSent ? `Enter the OTP sent to ${selectedPlayer?.name}.` : 'Select your name to receive an OTP.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOtpSent ? (
            <div className="space-y-2">
              <Label htmlFor="player-select">Player Name</Label>
               <Select onValueChange={setSelectedPlayerId} value={selectedPlayerId} disabled={isLoadingPlayers}>
                <SelectTrigger id="player-select">
                  <SelectValue placeholder={isLoadingPlayers ? "Loading players..." : "Select your name"} />
                </SelectTrigger>
                <SelectContent>
                  {masterPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleSendOtp} disabled={isSending || !selectedPlayerId} className="w-full">
              {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
            </Button>
          ) : (
            <>
              <Button onClick={handleLogin} disabled={isVerifying} className="w-full">
                {isVerifying ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
              <Button variant="link" onClick={() => setIsOtpSent(false)}>
                Use a different name
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
