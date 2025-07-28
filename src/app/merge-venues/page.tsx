
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getGameHistory, saveGameHistory } from '@/services/game-service';
import { getMasterVenues, saveMasterVenue } from '@/services/venue-service';
import type { GameHistory, MasterVenue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Map, Users, Library } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function MergeVenuesPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [isMergeModalOpen, setMergeModalOpen] = useState(false);
  const [primaryVenueId, setPrimaryVenueId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (!user.isAdmin) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to access this page.' });
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [router, toast]);

  useEffect(() => {
    async function loadData() {
      try {
        const [venues, games] = await Promise.all([
          getMasterVenues(),
          getGameHistory(),
        ]);
        setMasterVenues(venues);
        setGameHistory(games);
      } catch (error) {
        console.error('Failed to load data for merging:', error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Data',
          description: 'Could not fetch data. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const sortedVenues = useMemo(() => {
    return [...masterVenues].sort((a, b) => a.name.localeCompare(b.name));
  }, [masterVenues]);

  const handleSelectVenue = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedVenueIds(prev => [...prev, id]);
    } else {
      setSelectedVenueIds(prev => prev.filter(pId => pId !== id));
    }
  };

  const handleOpenMergeModal = () => {
    if (selectedVenueIds.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Selection Error',
        description: 'Please select at least two venues to merge.',
      });
      return;
    }
    setPrimaryVenueId(selectedVenueIds[0]); // Default to the first selected
    setMergeModalOpen(true);
  };

  const handleMerge = async () => {
    if (!primaryVenueId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a primary venue to merge into.' });
      return;
    }

    setIsMerging(true);

    const primaryVenue = masterVenues.find(p => p.id === primaryVenueId);
    if (!primaryVenue) {
        toast({ variant: 'destructive', title: 'Error', description: 'Primary venue not found.' });
        setIsMerging(false);
        return;
    }

    const secondaryVenueIds = selectedVenueIds.filter(id => id !== primaryVenueId);
    const secondaryVenues = masterVenues.filter(p => secondaryVenueIds.includes(p.id));
    const secondaryVenueNames = secondaryVenues.map(p => p.name);

    try {
      // Update all game history records
      const updatedGamesPromises = gameHistory.map(async game => {
        if (secondaryVenueNames.includes(game.venue)) {
          const updatedGame = { ...game, venue: primaryVenue.name };
          await saveGameHistory(updatedGame);
          return updatedGame;
        }
        return game;
      });

      const updatedGames = await Promise.all(updatedGamesPromises);
      setGameHistory(updatedGames);
      
      const updatedMasterVenues = await getMasterVenues();
      setMasterVenues(updatedMasterVenues);

      toast({
        title: 'Merge Successful!',
        description: `All game records for ${secondaryVenueNames.join(', ')} have been reassigned to ${primaryVenue.name}. The original venue entries were not deleted.`,
      });

    } catch (error) {
      console.error('Failed to merge venues:', error);
      toast({
        variant: 'destructive',
        title: 'Merge Failed',
        description: 'An error occurred while updating game history. Please check the console.',
      });
    } finally {
      setIsMerging(false);
      setMergeModalOpen(false);
      setSelectedVenueIds([]);
      setPrimaryVenueId('');
    }
  };
  
  const venuesToMerge = useMemo(() => {
    return masterVenues.filter(p => selectedVenueIds.includes(p.id));
  }, [masterVenues, selectedVenueIds]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className='space-y-1'>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-6 w-6" /> Merge Venues
              </CardTitle>
              <CardDescription>
                Select multiple venues to combine their historical data into a single venue record.
              </CardDescription>
            </div>
             <div className="flex gap-2">
                <Button onClick={handleOpenMergeModal} disabled={selectedVenueIds.length < 2}>
                    <Library className="mr-2" />
                    Merge Selected ({selectedVenueIds.length})
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 border rounded-md p-2">
            <div className="space-y-2">
              {sortedVenues.map(venue => (
                <div key={venue.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`select-${venue.id}`}
                    checked={selectedVenueIds.includes(venue.id)}
                    onCheckedChange={checked => handleSelectVenue(venue.id, !!checked)}
                  />
                  <Label htmlFor={`select-${venue.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{venue.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isMergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Venue Merge</DialogTitle>
            <DialogDescription>
              Select the primary venue to keep. All game history from the other selected venues will be reassigned to this one. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={primaryVenueId} onValueChange={setPrimaryVenueId}>
                <div className="space-y-2">
                    {venuesToMerge.map(venue => (
                        <div key={venue.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={venue.id} id={`radio-${venue.id}`} />
                            <Label htmlFor={`radio-${venue.id}`}>{venue.name}</Label>
                        </div>
                    ))}
                </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleMerge} disabled={isMerging}>
                {isMerging ? <Loader2 className="animate-spin" /> : <>Confirm Merge</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
