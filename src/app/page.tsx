
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building, ArrowRight } from 'lucide-react';
import { getClubs, Club } from '@/services/club-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClubSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClubs() {
      try {
        const fetchedClubs = await getClubs();
        if (fetchedClubs.length === 0) {
            // This is a temporary measure for first-time setup.
            // In a real SaaS, you'd have a proper club creation flow.
            toast({ title: 'No clubs found', description: 'Please ask your admin to set up a club.' });
        }
        setClubs(fetchedClubs);
      } catch (error) {
        console.error("Failed to fetch clubs", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load the list of clubs.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchClubs();
  }, [toast]);

  const handleClubSelect = (clubId: string) => {
    router.push(`/login?clubId=${clubId}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building />
            Select Your Club
          </CardTitle>
          <CardDescription>
            Choose your club to proceed to the login page.
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
      </Card>
    </div>
  );
}
