
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

export default function ClubSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);

  useEffect(() => {
    // On page load, remove any existing club selection to ensure a fresh start
    localStorage.removeItem('chip-maestro-clubId');

    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      router.replace('/login'); // Should not happen, but a safeguard
    }
  }, [router]);

  useEffect(() => {
    async function fetchClubs() {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const fetchedClubs = await getClubs();
        setClubs(fetchedClubs);
      } catch (error) {
        console.error("Failed to fetch clubs", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load the list of clubs.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchClubs();
  }, [toast, currentUser]);

  const handleClubSelect = (clubId: string) => {
    router.push(`/login?clubId=${clubId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('chip-maestro-user');
    router.replace('/login');
  };

  const isSuperAdmin = currentUser?.isAdmin === true && currentUser?.whatsappNumber === '919843350000';

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
            Choose a club to log in or manage settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {clubs.length > 0 ? (
                clubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => handleClubSelect(club.id)}
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
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
             {isSuperAdmin && (
                <Button variant="secondary" className="w-full" onClick={() => router.push('/settings')}>
                    <Plus className="mr-2 h-4 w-4" /> Manage Clubs
                </Button>
            )}
            <Button variant="outline" className="w-full" onClick={handleLogout}>Logout</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
