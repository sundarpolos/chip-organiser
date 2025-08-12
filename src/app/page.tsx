
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building, ArrowRight, ShieldCheck } from 'lucide-react';
import { getClubs, Club } from '@/services/club-service';
import { migrateLegacyData } from '@/services/migration-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MasterPlayer } from '@/lib/types';

export default function ClubSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);

  useEffect(() => {
    // Check for logged-in user to decide if we should show the migrate button
    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    async function fetchClubs() {
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
  }, [toast]);

  const handleClubSelect = (clubId: string) => {
    router.push(`/login?clubId=${clubId}`);
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateLegacyData();
      toast({
        title: 'Migration Complete!',
        description: `${result.message} You can now select Smart CLUB to log in.`,
      });
      // Refresh club list
      const fetchedClubs = await getClubs();
      setClubs(fetchedClubs);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsMigrating(false);
    }
  };
  
  const isSuperAdmin = currentUser?.whatsappNumber === '919843350000';
  const hasMigrated = clubs.some(c => c.name === 'Smart CLUB');

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
                  <p>No clubs found.</p>
                  {isSuperAdmin && !hasMigrated && <p>You may need to migrate your legacy data.</p>}
                </div>
              )}
              {isSuperAdmin && !hasMigrated && (
                 <div className="pt-4 border-t">
                    <Button onClick={handleMigration} disabled={isMigrating} className="w-full">
                      {isMigrating ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2"/>}
                      Migrate Legacy Data
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      This is a one-time action to move all existing players and games into the default "Smart CLUB".
                    </p>
                 </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
