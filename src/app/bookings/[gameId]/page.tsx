
'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Club, MasterPlayer, ScheduledGame, SeatBooking } from '@/lib/types';
import { Loader2, Plus, Trash2, Users, Send, Copy, Check } from 'lucide-react';
import { getClubs, getClub } from '@/services/club-service';
import { getMasterPlayers } from '@/services/player-service';
import { getScheduledGame, getSeatBookingsForGame, createSeatBooking, cancelSeatBooking } from '@/services/booking-service';
import { sendWhatsappMessage } from '@/ai/flows/send-whatsapp-message';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';


const ManageBookingsPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const gameId = params.gameId as string;

    const [game, setGame] = useState<ScheduledGame | null>(null);
    const [bookings, setBookings] = useState<SeatBooking[]>([]);
    const [allPlayers, setAllPlayers] = useState<MasterPlayer[]>([]);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [activeClub, setActiveClub] = useState<Club | null>(null);
    
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
    const [whatsappMessage, setWhatsappMessage] = useState('');


    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const isSuperAdmin = currentUser?.whatsappNumber === '919843350000';

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            if (!user.isAdmin) {
                toast({ variant: 'destructive', title: 'Access Denied' });
                router.push('/dashboard');
            }
        } else {
            router.push('/login');
        }
    }, [router, toast]);
    
    const refreshData = async () => {
        if (!gameId) return;

        try {
            const [
                gameData, 
                bookingsData, 
                playersData, 
                clubsData
            ] = await Promise.all([
                getScheduledGame(gameId),
                getSeatBookingsForGame(gameId),
                getMasterPlayers(),
                isSuperAdmin ? getClubs() : Promise.resolve([]),
            ]);

            if (!gameData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Scheduled game not found.' });
                router.push('/dashboard');
                return;
            }

            const clubData = await getClub(gameData.clubId);
            setActiveClub(clubData);

            setGame(gameData);
            setBookings(bookingsData);
            setAllPlayers(playersData);
            setAllClubs(clubsData);
            setSelectedClubId(gameData.clubId); // Default to game's club
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load booking data.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.isAdmin) {
            refreshData();
        }
    }, [currentUser, gameId]);

    const groupUpdateMessage = useMemo(() => {
        if (!game) return '';
        const confirmedPlayers = bookings
            .filter(b => b.status === 'confirmed')
            .map((b, index) => `${index + 1}. ${b.playerName}`)
            .join('\n');

        return `🎉 Confirmed Players for ${format(new Date(game.gameDate), 'PPP')} 🎉

Game Time: ${game.gameStartTime} ⏰

-----------------------------
${confirmedPlayers || 'No confirmations yet.'}
-----------------------------

Total: ${bookings.filter(b => b.status === 'confirmed').length} players

Please be on time!`;
    }, [game, bookings]);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(groupUpdateMessage).then(() => {
            setIsCopied(true);
            toast({ title: 'Copied!', description: 'Group update message copied to clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleAdminAddBooking = async () => {
        if (selectedPlayerIds.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select one or more players.' });
            return;
        }

        setIsSaving(true);
        try {
            const playersToAdd = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
            const promises = playersToAdd.map(player =>
                createSeatBooking({
                    scheduledGameId: gameId,
                    clubId: player.clubId,
                    playerId: player.id,
                    playerName: player.name,
                    playerWhatsappNumber: player.whatsappNumber,
                    status: 'confirmed',
                    confirmationType: 'admin',
                })
            );

            await Promise.all(promises);
            toast({ title: 'Players Added', description: `${playersToAdd.length} player(s) have been added to the game.` });
            setSelectedPlayerIds([]);
            await refreshData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add players.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdminRemoveBooking = async (bookingId: string) => {
        try {
            await cancelSeatBooking(bookingId);
            toast({ title: 'Booking Removed' });
            await refreshData();
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove booking.' });
        }
    };
    
    const handleSendWhatsappMessage = async () => {
        if (selectedBookingIds.length === 0 || !activeClub || !game) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please select players to message.' });
            return;
        }
        setIsSendingMessage(true);
        try {
            const playersToSend = bookings.filter(b => selectedBookingIds.includes(b.id));
            
            const sendPromises = playersToSend.map(player => {
                const automatedGreeting = `Hi ${player.playerName},\n\nThis is a friendly reminder for the game on *${format(new Date(game.gameDate), 'PPP')}* at *${game.gameStartTime}*. Please try to arrive a few minutes early.`;
                
                const customPart = whatsappMessage ? `\n\n${whatsappMessage}` : '';
                
                const signature = `\n\n- ${activeClub.name}`;

                const finalMessage = `${automatedGreeting}${customPart}${signature}`;

                return sendWhatsappMessage({
                    to: player.playerWhatsappNumber,
                    message: finalMessage,
                    ...(activeClub.whatsappConfig || {}),
                });
            });

            const results = await Promise.all(sendPromises);
            const successCount = results.filter(r => r.success).length;

            toast({
                title: 'Messages Sent',
                description: `Successfully sent messages to ${successCount} out of ${playersToSend.length} selected players.`,
            });
            setWhatsappMessage('');
            setSelectedBookingIds([]);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send messages.' });
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleSelectBooking = (id: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedBookingIds(prev => [...prev, id]);
        } else {
            setSelectedBookingIds(prev => prev.filter(bId => bId !== id));
        }
    };

    const handleSelectAllBookings = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedBookingIds(bookings.map(b => b.id));
        } else {
            setSelectedBookingIds([]);
        }
    };

    const handleSelectPlayerForManualAdd = (id: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedPlayerIds(prev => [...prev, id]);
        } else {
            setSelectedPlayerIds(prev => prev.filter(pId => pId !== id));
        }
    };
    
    const availablePlayers = useMemo(() => {
        return allPlayers
            .filter(p =>
                p.clubId === selectedClubId &&
                p.isActive &&
                !bookings.some(b => b.playerId === p.id && b.status === 'confirmed')
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allPlayers, selectedClubId, bookings]);


    if (isLoading || !game) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        )
    }

    const confirmedBookingsCount = bookings.filter(b => b.status === 'confirmed').length;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Bookings for {format(new Date(game.gameDate), 'PPP')} at {game.gameStartTime}</CardTitle>
                    <CardDescription>{confirmedBookingsCount} / {game.totalSeats} seats booked.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedBookingIds.length === bookings.length && bookings.length > 0}
                                        onCheckedChange={handleSelectAllBookings}
                                        aria-label="Select all bookings"
                                    />
                                </TableHead>
                                <TableHead>Player</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map(b => (
                                <TableRow key={b.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedBookingIds.includes(b.id)}
                                            onCheckedChange={checked => handleSelectBooking(b.id, !!checked)}
                                            aria-label={`Select booking for ${b.playerName}`}
                                        />
                                    </TableCell>
                                    <TableCell>{b.playerName}</TableCell>
                                    <TableCell>
                                        <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>{b.status}</Badge>
                                        {b.confirmationType === 'admin' && <span className="text-xs text-muted-foreground ml-2">(Admin)</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">Remove</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will remove {b.playerName}'s booking from this game.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleAdminRemoveBooking(b.id)}>Remove Booking</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {bookings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No bookings yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>WhatsApp Group Update</CardTitle>
                    <CardDescription>Copy the formatted text below and paste it into your group chat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        readOnly
                        value={groupUpdateMessage}
                        className="h-64 font-mono text-sm"
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={handleCopyToClipboard}
                        >
                            {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                            {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Send Individual WhatsApp Message</CardTitle>
                    <CardDescription>Send a custom message to the selected players from the list above.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Textarea
                        placeholder={`Add your custom message here. A greeting and signature will be added automatically.`}
                        value={whatsappMessage}
                        onChange={e => setWhatsappMessage(e.target.value)}
                        disabled={selectedBookingIds.length === 0}
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSendWhatsappMessage}
                            disabled={isSendingMessage || selectedBookingIds.length === 0}
                        >
                            {isSendingMessage ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                            Send to {selectedBookingIds.length} Player(s)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Add Player(s) Manually</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isSuperAdmin && (
                         <div className="space-y-2">
                            <Label htmlFor="club-select">Select Club</Label>
                            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                                <SelectTrigger id="club-select">
                                    <SelectValue placeholder="Select a club..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allClubs.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <ScrollArea className="h-48 border rounded-md p-2">
                       {availablePlayers.length > 0 ? (
                         availablePlayers.map(player => (
                            <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                              <Checkbox
                                id={`manage-add-${player.id}`}
                                checked={selectedPlayerIds.includes(player.id)}
                                onCheckedChange={checked => handleSelectPlayerForManualAdd(player.id, !!checked)}
                              />
                              <Label htmlFor={`manage-add-${player.id}`} className="flex-1 cursor-pointer">
                                {player.name}
                              </Label>
                            </div>
                          ))
                       ) : (
                         <p className="text-center text-muted-foreground p-4">All active players for this club are already booked or there are no players.</p>
                       )}
                    </ScrollArea>
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleAdminAddBooking} disabled={isSaving || selectedPlayerIds.length === 0}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add Selected ({selectedPlayerIds.length})
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManageBookingsPage;

    