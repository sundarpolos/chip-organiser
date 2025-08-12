
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { getClub } from '@/services/club-service';


function LoginPageContent() {
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [clubName, setClubName] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const clubId = searchParams.get('clubId');

  useEffect(() => {
    async function loadInitialData() {
      if (!clubId) {
        toast({
          variant: 'destructive',
          title: 'No Club Selected',
          description: 'Please select a club first.',
        });
        router.replace('/');
        return;
      }

      try {
        const [club, allPlayers] = await Promise.all([
            getClub(clubId),
            getMasterPlayers(),
        ]);

        if (!club) {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid club selected.' });
            router.replace('/');
            return;
        }
        setClubName(club.name);

        const clubPlayers = allPlayers.filter(p => p.clubId === clubId && (p.isActive ?? true) && p.whatsappNumber);
        const sortedPlayers = clubPlayers.sort((a, b) => a.name.localeCompare(b.name));
        setMasterPlayers(sortedPlayers);
        
      } catch (error) {
        console.error("Failed to load players for club", error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Players',
          description: 'Could not fetch the list of players for this club.',
        });
      } finally {
        setIsLoadingPlayers(false);
      }
    }
    loadInitialData();
  }, [clubId, router, toast]);

  const handleSendOtp = async () => {
    const selectedPlayer = masterPlayers.find(p => p.id === selectedPlayerId);
    if (!selectedPlayer || !selectedPlayer.whatsappNumber) {
      toast({
        variant: 'destructive',
        title: 'Invalid Player',
        description: 'Please select a valid player.',
      });
      return;
    }

    setIsSending(true);
    try {
      // Note: sendLoginOtp doesn't need clubId yet, as it identifies users by WhatsApp number.
      // This might change in a full SaaS model with non-unique numbers across clubs.
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
      const currentUser = masterPlayers.find(p => p.id === selectedPlayerId);

      if (currentUser && clubId) {
        // Store user and selected clubId in localStorage to simulate a session
        localStorage.setItem('chip-maestro-user', JSON.stringify(currentUser));
        localStorage.setItem('chip-maestro-clubId', clubId);
        router.replace('/dashboard');
      } else {
         throw new Error("Could not find user profile or club. Please try again.");
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
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-20"
        src="https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4"
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 -z-10" />
      <Card className="w-full max-w-sm mx-auto bg-background/[.25] backdrop-blur-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
            </div>
          <CardTitle>Login to {clubName || '...'}</CardTitle>
          <CardDescription>
            {isOtpSent ? `Enter the OTP sent to ${selectedPlayer?.name}.` : 'Select your name to receive WhatsApp OTP.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOtpSent ? (
            <div className="space-y-2">
              <Label htmlFor="player-select" className="text-center w-full block">Player Name</Label>
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
                placeholder="4-digit code"
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
           <Button variant="link" size="sm" onClick={() => router.push('/')}>
            Select a different club
          </Button>
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
