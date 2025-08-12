
'use client';

import { useEffect, useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building, ArrowRight, UserPlus, Trash2, Pencil, LogIn, Plus } from 'lucide-react';
import { getClubs, Club, createClub, deleteClub } from '@/services/club-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MasterPlayer } from '@/lib/types';
import { getMasterPlayers } from '@/services/player-service';

export default function ClubSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);

  useEffect(() => {
    async function setupDashboard() {
        setIsLoading(true);
        try {
            const allPlayers = await getMasterPlayers();
            const superAdmin = allPlayers.find(p => p.whatsappNumber === '919843350000');

            if (!superAdmin) {
                toast({ variant: 'destructive', title: 'Error', description: 'Super Admin user not found. Please log in normally.' });
                router.replace('/login'); // Fallback to a generic login
                return;
            }

            const allClubs = await getClubs();
            const smartClub = allClubs.find(c => c.name === 'Smart CLUB');

            if (!smartClub) {
                toast({ variant: 'destructive', title: 'Error', description: '"Smart CLUB" not found. Please create it or select another club.' });
                setClubs(allClubs); // Show other clubs if Smart CLUB is missing
                setIsLoading(false);
                return;
            }

            // Set localStorage for auto-login
            localStorage.setItem('chip-maestro-user', JSON.stringify(superAdmin));
            localStorage.setItem('chip-maestro-clubId', smartClub.id);

            // Redirect to dashboard
            router.replace('/dashboard');

        } catch (error) {
            console.error("Failed to setup dashboard", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not automatically log you in. Please select a club manually.' });
            setIsLoading(false);
        }
    }

    setupDashboard();
  }, [router, toast]);


  if (isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
             <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover -z-20"
                src="https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4"
            />
            <div className="absolute top-0 left-0 w-full h-full bg-black/50 -z-10" />
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <p className="text-white font-semibold">Taking you to the Smart CLUB dashboard...</p>
            </div>
        </div>
    );
  }

  // Fallback UI in case auto-login fails
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover -z-20"
            src="https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-black/50 -z-10" />
      <Card className="w-full max-w-md bg-background/[.25] backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building />
            Select Your Club
          </CardTitle>
          <CardDescription>
            Auto-login failed. Please select a club to log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
              {clubs.length > 0 ? (
                clubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => router.push(`/login?clubId=${club.id}`)}
                    className="w-full text-left p-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors flex justify-between items-center"
                  >
                    <span className="font-medium">{club.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <p>No clubs have been created yet.</p>
                </div>
              )}
            </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
             <Button variant="outline" className="w-full" onClick={() => router.replace('/login')}>Logout</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
