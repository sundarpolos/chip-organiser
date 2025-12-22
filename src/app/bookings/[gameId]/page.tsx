
'use client';

import { useState, useEffect, useMemo, useCallback, type FC } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Club, MasterPlayer, ScheduledGame, SeatBooking } from '@/lib/types';
import { Loader2, Plus, Trash2, Users, Send, Copy, Check, MessageSquare } from 'lucide-react';
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
import { generatePokerReminder } from '@/ai/flows/generate-poker-reminder';
import { Progress } from '@/components/ui/progress';


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
    const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);


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
    
    const refreshData = useCallback(async () => {
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
            setBookings(bookingsData.sort((a, b) => a.playerName.localeCompare(b.playerName)));
            setAllPlayers(playersData);
            setAllClubs(clubsData);
            setSelectedClubId(gameData.clubId); // Default to game's club
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load booking data.' });
        } finally {
            setIsLoading(false);
        }
    }, [gameId, isSuperAdmin, router, toast]);

    useEffect(() => {
        if (currentUser?.isAdmin) {
            refreshData();
        }
    }, [currentUser, gameId, refreshData]);

    const groupUpdateMessage = useMemo(() => {
        if (!game) return '';
        
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        const confirmedPlayerNames = confirmedBookings.map((b, index) => `${index + 1}. ${b.playerName}`).join('\n');
        
        let message = `🎉 Confirmed Players for ${format(new Date(game.gameDate), 'EEEE, PPP')} 🎉

Game Time: ${game.gameStartTime} ⏰

-----------------------------
${confirmedPlayerNames || 'No confirmations yet.'}
-----------------------------

Total: ${confirmedBookings.length} players

Please be on time!`;

        const remainingSeats = game.totalSeats - confirmedBookings.length;
        if (remainingSeats > 0) {
            message += `\n\n${remainingSeats} seat(s) still open for booking!`;
        }

        return message;
    }, [game, bookings]);

    const handleSendToGroup = async () => {
        if (!activeClub?.whatsappConfig?.whatsappGroupId || !groupUpdateMessage) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Club Group ID not set or message is empty.' });
            return;
        }
        setIsSendingMessage(true);
        try {
            const result = await sendWhatsappMessage({
                to: activeClub.whatsappConfig.whatsappGroupId,
                message: groupUpdateMessage,
                isGroup: true,
                apiUrl: activeClub.whatsappConfig.apiUrl,
                apiToken: activeClub.whatsappConfig.apiToken,
                senderMobile: activeClub.whatsappConfig.senderMobile,
            });
            if (result.success) {
                toast({ title: 'Group Update Sent!', description: 'The message was sent to the club group.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not send message.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSendingMessage(false);
        }
    };


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
        if (selectedBookingIds.length === 0 || !activeClub || !game || !whatsappMessage) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please select players and ensure a message is generated.' });
            return;
        }
        setIsSendingMessage(true);
        setWhatsappMessage('');
        
        const playersToSend = bookings.filter(b => selectedBookingIds.includes(b.id));
        const totalToSend = playersToSend.length;
        setSelectedBookingIds([]);
        
        const { id: toastId, update } = toast({
            title: `Sending ${totalToSend} message(s)...`,
            description: <Progress value={0} className="w-full" />,
        });

        let successfulSends = 0;
        let failedSends = 0;

        for (let i = 0; i < totalToSend; i++) {
            const player = playersToSend[i];
            const finalMessage = whatsappMessage.replace('[Player Name]', player.playerName);
            try {
                const result = await sendWhatsappMessage({
                    to: player.playerWhatsappNumber,
                    message: finalMessage,
                    ...(activeClub.whatsappConfig || {}),
                });
                if (result.success) {
                    successfulSends++;
                } else {
                    failedSends++;
                    console.error(`Failed to send to ${player.playerName}: ${result.error}`);
                }
            } catch (error) {
                failedSends++;
                console.error(`Exception while sending to ${player.playerName}:`, error);
            }
            const progress = ((i + 1) / totalToSend) * 100;
            update({ id: toastId, description: <Progress value={progress} className="w-full" /> });

            if (i < totalToSend - 1) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        setIsSendingMessage(false);
        
        update({
            id: toastId,
            title: 'Sending Complete!',
            description: `Sent to ${successfulSends} player(s). ${failedSends > 0 ? `${failedSends} failed.` : ''}`,
        });
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
    
    const generateMessageTemplate = useCallback(async (customText?: string) => {
        if (!game || !activeClub) return;
        setIsGeneratingTemplate(true);
        try {
            const result = await generatePokerReminder({
                gameDate: format(new Date(game.gameDate), 'EEEE, PPP'),
                gameTime: game.gameStartTime,
                clubName: activeClub.name,
                customMessage: customText,
            });
            if (result.reminderTemplate) {
                setWhatsappMessage(result.reminderTemplate);
            }
        } catch (error) {
            console.error("Template generation failed:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate message template.' });
            // Fallback to a simpler message
            setWhatsappMessage(`Hi [Player Name],\n\nThis is a reminder for the game on ${format(new Date(game.gameDate), 'EEEE, PPP')} at ${game.gameStartTime}. Please be on time.\n\n- ${activeClub.name}`);
        } finally {
            setIsGeneratingTemplate(false);
        }
    }, [game, activeClub, toast]);

    useEffect(() => {
        if (selectedBookingIds.length > 0 && !whatsappMessage && !isGeneratingTemplate) {
            generateMessageTemplate();
        } else if (selectedBookingIds.length === 0) {
            setWhatsappMessage('');
        }
    }, [selectedBookingIds, whatsappMessage, isGeneratingTemplate, generateMessageTemplate]);


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
                    <CardDescription>Copy the formatted text below and paste it into your group chat, or send it directly to your configured group.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        readOnly
                        value={groupUpdateMessage}
                        className="h-64 font-mono text-sm"
                    />
                    <div className="flex justify-between items-center">
                        <Button
                            onClick={handleSendToGroup}
                            disabled={isSendingMessage || !activeClub?.whatsappConfig?.whatsappGroupId}
                        >
                            {isSendingMessage ? <Loader2 className="animate-spin mr-2"/> : <MessageSquare className="mr-2 h-4 w-4" />}
                            Send to Group
                        </Button>
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
                    <CardDescription>Send a custom message to the selected players from the list above. A 10s delay is applied between messages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Textarea
                        placeholder={isGeneratingTemplate ? "Generating creative reminder..." : "Select players to generate a message template."}
                        value={whatsappMessage}
                        onChange={e => setWhatsappMessage(e.target.value)}
                        disabled={selectedBookingIds.length === 0 || isGeneratingTemplate}
                        className="min-h-[150px]"
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
