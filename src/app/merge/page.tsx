
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getGameHistory, saveGameHistory } from '@/services/game-service';
import { getMasterPlayers, saveMasterPlayer, deleteMasterPlayer } from '@/services/player-service';
import type { GameHistory, MasterPlayer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Merge, UserCheck, Users, SortAsc } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';


export default function MergePlayersPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isMergeModalOpen, setMergeModalOpen] = useState(false);
  const [primaryPlayerId, setPrimaryPlayerId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [isSorted, setIsSorted] = useState(false);

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
        const [players, games] = await Promise.all([
          getMasterPlayers(),
          getGameHistory(),
        ]);
        setMasterPlayers(players);
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

  const sortedPlayers = useMemo(() => {
    const playersCopy = [...masterPlayers];
    if (isSorted) {
      playersCopy.sort((a, b) => {
        const groupA = a.group || 'zzzz'; // Put players without a group at the end
        const groupB = b.group || 'zzzz';
        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;
        // If groups are the same, sort by name
        return a.name.localeCompare(b.name);
      });
    } else {
      playersCopy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return playersCopy;
  }, [masterPlayers, isSorted]);

  const handleSelectPlayer = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayerIds(prev => [...prev, id]);
    } else {
      setSelectedPlayerIds(prev => prev.filter(pId => pId !== id));
    }
  };

  const handleOpenMergeModal = () => {
    if (selectedPlayerIds.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Selection Error',
        description: 'Please select at least two players to merge.',
      });
      return;
    }
    setPrimaryPlayerId(selectedPlayerIds[0]); // Default to the first selected
    setMergeModalOpen(true);
  };

  const handleMerge = async () => {
    if (!primaryPlayerId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a primary player to merge into.' });
      return;
    }

    setIsMerging(true);

    const primaryPlayer = masterPlayers.find(p => p.id === primaryPlayerId);
    if (!primaryPlayer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Primary player not found.' });
        setIsMerging(false);
        return;
    }

    const secondaryPlayerIds = selectedPlayerIds.filter(id => id !== primaryPlayerId);
    const secondaryPlayers = masterPlayers.filter(p => secondaryPlayerIds.includes(p.id));
    const secondaryPlayerNames = secondaryPlayers.map(p => p.name);

    try {
      // Update all game history records
      const updatedGamesPromises = gameHistory.map(async game => {
        let gameWasModified = false;
        const updatedPlayers = game.players.map(player => {
          if (secondaryPlayerNames.includes(player.name)) {
            gameWasModified = true;
            return { ...player, name: primaryPlayer.name };
          }
          return player;
        });

        if (gameWasModified) {
          const updatedGame = { ...game, players: updatedPlayers };
          await saveGameHistory(updatedGame);
          return updatedGame;
        }
        return game; // No changes needed for this game
      });

      const updatedGames = await Promise.all(updatedGamesPromises);
      setGameHistory(updatedGames);

      toast({
        title: 'Merge Successful!',
        description: `All game records for ${secondaryPlayerNames.join(', ')} have been reassigned to ${primaryPlayer.name}. The original player entries were not deleted.`,
      });

    } catch (error) {
      console.error('Failed to merge players:', error);
      toast({
        variant: 'destructive',
        title: 'Merge Failed',
        description: 'An error occurred while updating game history. Please check the console.',
      });
    } finally {
      setIsMerging(false);
      setMergeModalOpen(false);
      setSelectedPlayerIds([]);
      setPrimaryPlayerId('');
    }
  };
  
  const playersToMerge = useMemo(() => {
    return masterPlayers.filter(p => selectedPlayerIds.includes(p.id));
  }, [masterPlayers, selectedPlayerIds]);


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
                <Merge className="h-6 w-6" /> Merge Players
              </CardTitle>
              <CardDescription>
                Select multiple players to combine their historical data into a single player record.
              </CardDescription>
            </div>
             <div className="flex gap-2">
                <Button onClick={() => setIsSorted(!isSorted)} variant="outline">
                    <SortAsc className="mr-2"/>
                    {isSorted ? "Un-sort by Group" : "Sort by Group"}
                </Button>
                <Button onClick={handleOpenMergeModal} disabled={selectedPlayerIds.length < 2}>
                    <Users className="mr-2" />
                    Merge Selected ({selectedPlayerIds.length})
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 border rounded-md p-2">
            <div className="space-y-2">
              {sortedPlayers.map(player => (
                <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`select-${player.id}`}
                    checked={selectedPlayerIds.includes(player.id)}
                    onCheckedChange={checked => handleSelectPlayer(player.id, !!checked)}
                  />
                  <Label htmlFor={`select-${player.id}`} className="flex-1 cursor-pointer grid grid-cols-2">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-muted-foreground">{player.group || 'No Group'}</span>
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
            <DialogTitle>Confirm Player Merge</DialogTitle>
            <DialogDescription>
              Select the primary player to keep. All game history from the other selected players will be reassigned to this player. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={primaryPlayerId} onValueChange={setPrimaryPlayerId}>
                <div className="space-y-2">
                    {playersToMerge.map(player => (
                        <div key={player.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={player.id} id={`radio-${player.id}`} />
                            <Label htmlFor={`radio-${player.id}`}>{player.name}</Label>
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
                {isMerging ? <Loader2 className="animate-spin" /> : <><UserCheck className="mr-2"/>Confirm Merge</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    
