
'use client';

import { useState, useEffect, type FC, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Clock, Building, Plus, Pencil, Trash2, LogIn, Users } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { WhatsappConfig, Club, MasterPlayer, MasterVenue, GameHistory } from '@/lib/types';
import { getClubs, createClub, updateClub, deleteClub } from '@/services/club-service';
import { getMasterPlayers, saveMasterPlayer } from '@/services/player-service';
import { getMasterVenues } from '@/services/venue-service';
import { getGameHistory } from '@/services/game-service';
import { Switch } from '@/components/ui/switch';

const SUPER_ADMIN_WHATSAPP = '919843350000';

const ClubManagement: FC<{
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
    players: MasterPlayer[];
    venues: MasterVenue[];
    games: GameHistory[];
    toast: ReturnType<typeof useToast>['toast'];
    currentUser: MasterPlayer;
}> = ({ clubs, setClubs, players, venues, games, toast, currentUser }) => {
    const router = useRouter();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState<Club | null>(null);
    const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

    const handleEnterDashboard = (clubId: string) => {
        router.push(`/dashboard?clubId=${clubId}`);
    };

    const handleDeleteClub = async () => {
        if (!clubToDelete) return;

        try {
            await deleteClub(clubToDelete.id);
            setClubs(prev => prev.filter(c => c.id !== clubToDelete.id));
            toast({ title: 'Club Deleted', description: `"${clubToDelete.name}" has been permanently deleted.` });
        } catch (error) {
            console.error('Failed to delete club', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the club.' });
        } finally {
            setClubToDelete(null);
        }
    };

    const getClubStats = (clubId: string) => {
        const playerCount = players.filter(p => p.clubId === clubId).length;
        const venueCount = venues.filter(v => v.clubId === clubId).length;
        const gameCount = games.filter(g => g.clubId === clubId).length;
        return { playerCount, venueCount, gameCount };
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Club Management</CardTitle>
                        <Button onClick={() => setCreateModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Club</Button>
                    </div>
                    <CardDescription>Create, edit, and manage all clubs in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Club Name</TableHead>
                                <TableHead>Players</TableHead>
                                <TableHead>Venues</TableHead>
                                <TableHead>Games</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clubs.map(club => {
                                const { playerCount, venueCount, gameCount } = getClubStats(club.id);
                                return (
                                <TableRow key={club.id}>
                                    <TableCell className="font-medium">{club.name}</TableCell>
                                    <TableCell>{playerCount}</TableCell>
                                    <TableCell>{venueCount}</TableCell>
                                    <TableCell>{gameCount}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEnterDashboard(club.id)}>
                                            <LogIn className="mr-2 h-4 w-4" /> Enter
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(club)}><Pencil className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the <strong>{club.name}</strong> club and all associated players, games, and venues.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => { setClubToDelete(club); handleDeleteClub(); }}>Continue</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateEditClubDialog
                isOpen={isCreateModalOpen}
                onOpenChange={setCreateModalOpen}
                players={players}
                currentUser={currentUser}
                onSave={async (newClub) => {
                    setClubs(prev => [...prev, newClub].sort((a,b) => a.name.localeCompare(b.name)));
                }}
                toast={toast}
            />
            {isEditModalOpen && (
                 <CreateEditClubDialog
                    isOpen={!!isEditModalOpen}
                    onOpenChange={() => setEditModalOpen(null)}
                    players={players}
                    currentUser={currentUser}
                    onSave={async (updatedClub) => {
                        setClubs(prev => prev.map(c => c.id === updatedClub.id ? updatedClub : c));
                    }}
                    toast={toast}
                    clubToEdit={isEditModalOpen}
                />
            )}
        </>
    );
};

const CreateEditClubDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    players: MasterPlayer[];
    currentUser: MasterPlayer;
    onSave: (club: Club) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
    clubToEdit?: Club | null;
}> = ({ isOpen, onOpenChange, players, currentUser, onSave, toast, clubToEdit }) => {
    const [clubName, setClubName] = useState('');
    const [adminId, setAdminId] = useState('');
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
        apiUrl: '', apiToken: '', senderMobile: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (clubToEdit) {
            setClubName(clubToEdit.name);
            setWhatsappConfig(clubToEdit.whatsappConfig || { apiUrl: '', apiToken: '', senderMobile: '' });
            const clubAdmin = players.find(p => p.clubId === clubToEdit.id && p.isAdmin);
            if (clubAdmin) {
                setAdminId(clubAdmin.id);
            }
        } else {
            setClubName('');
            setAdminId('');
            setWhatsappConfig({ apiUrl: '', apiToken: '', senderMobile: '' });
        }
    }, [clubToEdit, players]);
    
    const nonAdminPlayers = players.filter(p => !p.isAdmin || p.whatsappNumber === SUPER_ADMIN_WHATSAPP);

    const handleSave = async () => {
        if (!clubName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide a club name.' });
            return;
        }

        setIsSaving(true);
        try {
            if (clubToEdit) { // Editing existing club
                const updatedClubData: Club = { ...clubToEdit, name: clubName, whatsappConfig };
                const savedClub = await updateClub(updatedClubData);
                toast({ title: 'Club Updated', description: `"${clubName}" has been updated.`});
                onSave(savedClub);
            } else { // Creating new club
                if (!adminId) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Please select an admin for the new club.' });
                    setIsSaving(false);
                    return;
                }
                const newClubPayload: Omit<Club, 'id'> = {
                    name: clubName,
                    ownerId: currentUser.id,
                    whatsappConfig,
                };
                const newClub = await createClub(newClubPayload);
                
                // Promote selected player to admin for that club
                const playerToPromote = players.find(p => p.id === adminId);
                if (playerToPromote) {
                    await saveMasterPlayer({ ...playerToPromote, isAdmin: true, clubId: newClub.id });
                }
                toast({ title: 'Club Created', description: `"${clubName}" has been created successfully.`});
                onSave(newClub);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save club', error);
            const errorMessage = error instanceof Error ? error.message : 'Could not save the club.';
            toast({ variant: 'destructive', title: 'Error', description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{clubToEdit ? 'Edit Club' : 'Create New Club'}</DialogTitle>
                    <DialogDescription>
                        {clubToEdit ? 'Update the details for this club.' : 'Enter a name for the new club and assign an admin.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="club-name">Club Name</Label>
                        <Input id="club-name" value={clubName} onChange={e => setClubName(e.target.value)} />
                    </div>
                    {!clubToEdit && (
                         <div className="space-y-2">
                            <Label htmlFor="club-admin">Club Admin</Label>
                             <Select value={adminId} onValueChange={setAdminId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a player to be admin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {nonAdminPlayers.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <Accordion type="single" collapsible>
                        <AccordionItem value="whatsapp">
                            <AccordionTrigger>WhatsApp API Settings</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="wa-api-url">API URL</Label>
                                    <Input id="wa-api-url" value={whatsappConfig.apiUrl} onChange={e => setWhatsappConfig(c => ({...c, apiUrl: e.target.value}))} placeholder="e.g., https://api.provider.com/send" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-api-token">API Token</Label>
                                    <Input id="wa-api-token" value={whatsappConfig.apiToken} onChange={e => setWhatsappConfig(c => ({...c, apiToken: e.target.value}))} placeholder="Your API token" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-sender-mobile">Sender Mobile</Label>
                                    <Input id="wa-sender-mobile" value={whatsappConfig.senderMobile} onChange={e => setWhatsappConfig(c => ({...c, senderMobile: e.target.value}))} placeholder="e.g., 14155552671" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {clubToEdit ? 'Save Changes' : 'Create Club'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


const PlayerManagement: FC<{
    players: MasterPlayer[];
    setPlayers: React.Dispatch<React.SetStateAction<MasterPlayer[]>>;
    clubs: Club[];
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ players, setPlayers, clubs, toast }) => {
    const [playerToEdit, setPlayerToEdit] = useState<MasterPlayer | null>(null);

    const handleSavePlayer = async (player: MasterPlayer) => {
        try {
            const savedPlayer = await saveMasterPlayer(player);
            setPlayers(prev => prev.map(p => p.id === savedPlayer.id ? savedPlayer : p));
            toast({ title: 'Player Saved', description: `Details for ${player.name} have been updated.` });
        } catch (error) {
            console.error('Failed to save player', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save player details.' });
        }
    };

    const playersByClub = useMemo(() => {
        const grouped = new Map<string, MasterPlayer[]>();
        
        // Group players by club ID
        players.forEach(player => {
            const clubId = player.clubId || 'unassigned';
            if (!grouped.has(clubId)) {
                grouped.set(clubId, []);
            }
            grouped.get(clubId)!.push(player);
        });

        // Sort players within each group alphabetically by name
        grouped.forEach((playerList) => {
            playerList.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Convert map to array and sort clubs by name
        const clubMap = new Map(clubs.map(c => [c.id, c.name]));
        return Array.from(grouped.entries()).sort((a, b) => {
            const clubNameA = clubMap.get(a[0]) || 'zzz';
            const clubNameB = clubMap.get(b[0]) || 'zzz';
            return clubNameA.localeCompare(clubNameB);
        });

    }, [players, clubs]);

    const getClubName = (clubId: string) => {
        return clubs.find(c => c.id === clubId)?.name || 'Unassigned';
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Player Management</CardTitle>
                    <CardDescription>Edit player details, including their assigned club and roles. Players are grouped by club.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {playersByClub.map(([clubId, clubPlayers]) => (
                            <AccordionItem value={clubId} key={clubId}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-lg">{getClubName(clubId)}</span>
                                        <span className="text-sm text-muted-foreground">({clubPlayers.length} players)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Player Name</TableHead>
                                                <TableHead>WhatsApp Number</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clubPlayers.map(player => (
                                                <TableRow key={player.id}>
                                                    <TableCell className="font-medium">{player.name}</TableCell>
                                                    <TableCell>{player.whatsappNumber}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setPlayerToEdit(player)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
            <EditPlayerDialog
                isOpen={!!playerToEdit}
                onOpenChange={() => setPlayerToEdit(null)}
                player={playerToEdit}
                clubs={clubs}
                onSave={handleSavePlayer}
                toast={toast}
            />
        </>
    );
};


const EditPlayerDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    player: MasterPlayer | null;
    clubs: Club[];
    onSave: (player: MasterPlayer) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, player, clubs, onSave, toast }) => {
    const [editablePlayer, setEditablePlayer] = useState<MasterPlayer | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (player) {
            setEditablePlayer(JSON.parse(JSON.stringify(player)));
        }
    }, [player]);

    const handleSave = async () => {
        if (!editablePlayer?.name || !editablePlayer.clubId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Player name and club are required.' });
            return;
        }
        setIsSaving(true);
        await onSave(editablePlayer);
        setIsSaving(false);
        onOpenChange(false);
    };

    if (!editablePlayer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Player: {player?.name}</DialogTitle>
                    <DialogDescription>
                        Update the player's details and permissions below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-name">Player Name</Label>
                        <Input
                            id="edit-player-name"
                            value={editablePlayer.name}
                            onChange={(e) => setEditablePlayer(p => p ? { ...p, name: e.target.value } : null)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-whatsapp">WhatsApp Number</Label>
                        <Input
                            id="edit-player-whatsapp"
                            value={editablePlayer.whatsappNumber}
                            onChange={(e) => setEditablePlayer(p => p ? { ...p, whatsappNumber: e.target.value } : null)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-club">Club</Label>
                        <Select
                            value={editablePlayer.clubId}
                            onValueChange={(value) => setEditablePlayer(p => p ? { ...p, clubId: value } : null)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="space-y-3 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-admin">Is Admin</Label>
                                <Switch
                                    id="is-admin"
                                    checked={editablePlayer.isAdmin}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isAdmin: checked } : null)}
                                    disabled={editablePlayer.whatsappNumber === SUPER_ADMIN_WHATSAPP}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-banker">Is Banker</Label>
                                <Switch
                                    id="is-banker"
                                    checked={!!editablePlayer.isBanker}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isBanker: checked } : null)}
                                />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="is-active">Is Active</Label>
                                <Switch
                                    id="is-active"
                                    checked={editablePlayer.isActive ?? true}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isActive: checked } : null)}
                                    disabled={editablePlayer.whatsappNumber === SUPER_ADMIN_WHATSAPP}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<MasterPlayer[]>([]);
  const [venues, setVenues] = useState<MasterVenue[]>([]);
  const [games, setGames] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isSuperAdmin = currentUser?.isAdmin === true && currentUser?.whatsappNumber === SUPER_ADMIN_WHATSAPP;

  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        if (user.whatsappNumber !== SUPER_ADMIN_WHATSAPP) {
            toast({ variant: 'destructive', title: 'Access Denied' });
            router.replace('/');
        }
    } else {
      router.replace('/login');
    }
  }, [router, toast]);
  
  useEffect(() => {
      async function loadData() {
          if (!isSuperAdmin) return;
          try {
              const [allClubs, allPlayers, allVenues, allGames] = await Promise.all([
                getClubs(), 
                getMasterPlayers(),
                getMasterVenues(),
                getGameHistory(),
              ]);
              setClubs(allClubs.sort((a,b) => a.name.localeCompare(b.name)));
              setPlayers(allPlayers);
              setVenues(allVenues);
              setGames(allGames);
          } catch(e) {
              const errorMessage = e instanceof Error ? e.message : 'Could not load required data.'
              toast({variant: 'destructive', title: 'Error', description: errorMessage});
          } finally {
              setIsLoading(false);
          }
      }
      loadData();
  }, [isSuperAdmin, toast]);

  if (isLoading || !isSuperAdmin) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Super Admin Settings</h1>
        <p className="text-muted-foreground">Manage clubs, players, and system-wide configurations.</p>
      </div>
       <ClubManagement 
        clubs={clubs} 
        setClubs={setClubs} 
        players={players}
        venues={venues}
        games={games}
        toast={toast} 
        currentUser={currentUser} />
       <PlayerManagement players={players} setPlayers={setPlayers} clubs={clubs} toast={toast} />
    </div>
  );
}
