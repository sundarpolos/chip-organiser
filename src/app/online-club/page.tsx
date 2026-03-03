
'use client';

import { useState, useEffect, useMemo, type FC, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  getOnlinePlayerAccount,
  getOnlineLedgerEntries,
  addProfitLoss,
  updateProfitLoss,
  deleteProfitLoss,
  getOnlineClubs
} from '@/services/online-club-service';
import { getMasterPlayers } from '@/services/player-service';
import { getActiveStakingAgreementForPlayer, getAgreementsByPlayer, createStakingAgreement, cancelStakingAgreement } from '@/services/staking-service';
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, OnlineClub, StakingAgreement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Save, Edit, Trash2, Landmark, Banknote, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';


const OnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [account, setAccount] = useState<OnlinePlayerAccount | null>(null);
    const [ledger, setLedger] = useState<OnlineLedgerEntry[]>([]);
    const [onlineClubs, setOnlineClubs] = useState<OnlineClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Staking State
    const [clubPlayers, setClubPlayers] = useState<MasterPlayer[]>([]);
    const [agreementStakingMe, setAgreementStakingMe] = useState<StakingAgreement | null>(null);
    const [agreementsWhereIAmStaker, setAgreementsWhereIAmStaker] = useState<StakingAgreement[]>([]);
    const [isStakingModalOpen, setStakingModalOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<OnlineLedgerEntry | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        } else {
            router.push('/login');
        }
    }, [router]);

    const refreshData = useCallback(async () => {
        if (!currentUser) return;
        try {
            const activeClubId = localStorage.getItem('chip-maestro-clubId');
            if (!activeClubId) {
                toast({ variant: 'destructive', title: 'No active club', description: 'Please select a club from your dashboard.' });
                setIsLoading(false);
                return;
            }

            const [playerAccount, playerLedger, clubs, allPlayers, agreementStakingMe, agreementsIAmStaker] = await Promise.all([
                getOnlinePlayerAccount(currentUser.id),
                getOnlineLedgerEntries(currentUser.id),
                getOnlineClubs(activeClubId),
                getMasterPlayers(),
                getActiveStakingAgreementForPlayer(currentUser.id),
                getAgreementsByPlayer(currentUser.id, 'staker'),
            ]);
            setAccount(playerAccount);
            setLedger(playerLedger);
            setOnlineClubs(clubs);
            setClubPlayers(allPlayers.filter(p => p.clubId === activeClubId && p.id !== currentUser.id));
            setAgreementStakingMe(agreementStakingMe);
            setAgreementsWhereIAmStaker(agreementsIAmStaker);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to load online account data.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, toast]);

    useEffect(() => {
        if (currentUser) {
            refreshData();
        }
    }, [currentUser, refreshData]);

    const handlePlSubmit = async (amount: number, notes: string, date: string, onlineClubName: string) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await addProfitLoss(currentUser.id, amount, notes, date, onlineClubName);
            toast({ title: 'Success', description: 'Your P/L has been recorded.' });
            await refreshData();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not save P/L.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleEditSubmit = async (entryId: string, amount: number, notes: string, date: string, onlineClubName: string) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await updateProfitLoss(currentUser.id, entryId, amount, notes, date, onlineClubName);
            toast({ title: 'Success', description: 'Your P/L entry has been updated.' });
            await refreshData();
            setEditModalOpen(false);
            setEntryToEdit(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not update entry.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!currentUser) return;
        try {
            await deleteProfitLoss(currentUser.id, entryId);
            toast({ title: 'Entry Deleted', description: 'The ledger entry has been removed.' });
            await refreshData();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not delete entry.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        }
    };
    
    const handleCreateStakingAgreement = async (stakedPlayerId: string, percentage: number) => {
        if (!currentUser) return;
        try {
            const activeClubId = localStorage.getItem('chip-maestro-clubId');
            if (!activeClubId) {
                throw new Error("No active club selected. Cannot create staking agreement.");
            }
            await createStakingAgreement({
                stakerId: currentUser.id,
                stakedPlayerId,
                percentage,
                clubId: activeClubId,
            });
            toast({ title: 'Staking Started!', description: `You are now staking the selected player.`});
            await refreshData();
        } catch (error) {
             const msg = error instanceof Error ? error.message : 'Could not create staking agreement.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        }
    };

    const handleCancelStakingAgreement = async (agreementId: string) => {
        try {
            await cancelStakingAgreement(agreementId);
            toast({ title: 'Staking Agreement Cancelled' });
            await refreshData();
        } catch (error) {
             const msg = error instanceof Error ? error.message : 'Could not cancel agreement.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Landmark /> Online Club Dashboard</CardTitle>
                            <CardDescription>Welcome, {currentUser?.name}. Here you can manage your online play finances.</CardDescription>
                        </div>
                         {currentUser?.isAdmin && (
                            <Button asChild variant="outline">
                                <Link href="/online-club/admin">Admin Dashboard</Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">
                        Balance: <span className={account?.balance ?? 0 >= 0 ? 'text-green-600' : 'text-red-600'}>₹{account?.balance.toFixed(2) ?? '0.00'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Last updated: {account ? format(parseISO(account.lastUpdated), 'PPP p') : 'N/A'}</p>
                </CardContent>
            </Card>
            
            <StakingDashboard
                agreementStakingMe={agreementStakingMe}
                agreementsWhereIAmStaker={agreementsWhereIAmStaker}
                onOpenCreateDialog={() => setStakingModalOpen(true)}
                onCancelAgreement={handleCancelStakingAgreement}
            />

            <SubmitPlCard 
                isSubmitting={isSubmitting} 
                onSubmit={handlePlSubmit} 
                onlineClubs={onlineClubs} 
                isStaked={!!agreementStakingMe}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Online Club</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="capitalize">{entry.type}</TableCell>
                                    <TableCell>{entry.onlineClubName || '-'}</TableCell>
                                    <TableCell>{entry.notes}</TableCell>
                                    <TableCell className={`text-right font-mono ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {entry.amount >= 0 ? '+' : ''}₹{entry.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">₹{entry.runningBalance.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                      {entry.type === 'p/l' && (
                                        <div className="flex justify-end gap-2">
                                           <Button variant="ghost" size="icon" onClick={() => { setEntryToEdit(entry); setEditModalOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                           <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete this P/L entry of ₹{entry.amount.toFixed(2)}. This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                           </AlertDialog>
                                        </div>
                                      )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ledger.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">No transactions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {entryToEdit && (
              <EditPlDialog
                isOpen={isEditModalOpen}
                onOpenChange={setEditModalOpen}
                entry={entryToEdit}
                isSubmitting={isSubmitting}
                onSubmit={handleEditSubmit}
                onlineClubs={onlineClubs}
              />
            )}
             <CreateStakingDialog
                isOpen={isStakingModalOpen}
                onOpenChange={setStakingModalOpen}
                players={clubPlayers}
                onSubmit={handleCreateStakingAgreement}
            />
        </div>
    );
};

const StakingDashboard: FC<{
    agreementStakingMe: StakingAgreement | null;
    agreementsWhereIAmStaker: StakingAgreement[];
    onOpenCreateDialog: () => void;
    onCancelAgreement: (agreementId: string) => void;
}> = ({ agreementStakingMe, agreementsWhereIAmStaker, onOpenCreateDialog, onCancelAgreement }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Staking Dashboard</CardTitle>
                <CardDescription>Manage your staking agreements. You can stake other players or be staked by them.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Who is Staking Me?</h3>
                    {agreementStakingMe ? (
                        <div className="p-3 border rounded-md bg-muted/50">
                            <p>You are currently being staked by <strong>{agreementStakingMe.stakerName}</strong>.</p>
                            <p className="text-sm text-muted-foreground">They receive {agreementStakingMe.percentage}% of your profits. Losses are covered by them.</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No one is currently staking you.</p>
                    )}
                </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Players You Are Staking</h3>
                        <Button size="sm" onClick={onOpenCreateDialog}><Plus className="mr-2 h-4 w-4" /> New Stake</Button>
                    </div>
                     {agreementsWhereIAmStaker.length > 0 ? (
                        <div className="space-y-2">
                            {agreementsWhereIAmStaker.map(agreement => (
                                <div key={agreement.id} className="p-3 border rounded-md flex justify-between items-center">
                                    <div>
                                        <p>You are staking <strong>{agreement.stakedPlayerName}</strong>.</p>
                                        <p className="text-sm text-muted-foreground">You receive {agreement.percentage}% of their profits and cover 100% of their losses.</p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">End</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>End Staking Agreement?</AlertDialogTitle>
                                                <AlertDialogDescription>Are you sure you want to stop staking {agreement.stakedPlayerName}? This cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onCancelAgreement(agreement.id)}>Confirm & End</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">You are not currently staking any players.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const CreateStakingDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    players: MasterPlayer[];
    onSubmit: (stakedPlayerId: string, percentage: number) => void;
}> = ({ isOpen, onOpenChange, players, onSubmit }) => {
    const [stakedPlayerId, setStakedPlayerId] = useState('');
    const [percentage, setPercentage] = useState(50);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!stakedPlayerId || percentage <= 0 || percentage >= 100) {
            alert('Please select a player and enter a percentage between 1 and 99.');
            return;
        }
        setIsSubmitting(true);
        await onSubmit(stakedPlayerId, percentage);
        setIsSubmitting(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Staking Agreement</DialogTitle>
                    <DialogDescription>Select a player to stake and the percentage of their profit you will receive.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="staked-player">Player to Stake</Label>
                        <Select value={stakedPlayerId} onValueChange={setStakedPlayerId}>
                            <SelectTrigger id="staked-player">
                                <SelectValue placeholder="Select a player from your club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {players.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stake-percentage">Your Profit Share (%)</Label>
                        <Input id="stake-percentage" type="number" min="1" max="99" value={percentage} onChange={e => setPercentage(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin"/> : "Create Agreement"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SubmitPlCard: FC<{ isSubmitting: boolean; onSubmit: (amount: number, notes: string, date: string, onlineClubName: string) => void; onlineClubs: OnlineClub[], isStaked: boolean }> = ({ isSubmitting, onSubmit, onlineClubs, isStaked }) => {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [onlineClubName, setOnlineClubName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || !notes || !onlineClubName) {
            alert('Please enter a valid amount, notes, and select an online club.');
            return;
        }
        onSubmit(numAmount, notes, date, onlineClubName);
        setAmount('');
        setNotes('');
        setOnlineClubName('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Daily Profit/Loss</CardTitle>
                 {isStaked && <CardDescription className="text-amber-600 font-semibold">Note: You are currently being staked. Profits and losses will be split automatically.</CardDescription>}
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pl-amount">Amount</Label>
                            <Input id="pl-amount" type="number" step="any" placeholder="e.g. 1500 or -500" value={amount} onChange={e => setAmount(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pl-date">Date</Label>
                            <Input id="pl-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="online-club">Online Club</Label>
                        <Select value={onlineClubName} onValueChange={setOnlineClubName} required>
                            <SelectTrigger id="online-club">
                                <SelectValue placeholder="Select an online club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {onlineClubs && onlineClubs.filter(c => c.name).length > 0 ? (
                                    onlineClubs.filter(c => c.name).map(club => (
                                        <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No online clubs found. An admin must create them in Settings.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pl-notes">Notes</Label>
                        <Textarea id="pl-notes" placeholder="e.g. PokerBaazi session, 2 tables" value={notes} onChange={e => setNotes(e.target.value)} required />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Submit P/L
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

const EditPlDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entry: OnlineLedgerEntry;
  isSubmitting: boolean;
  onSubmit: (entryId: string, amount: number, notes: string, date: string, onlineClubName: string) => void;
  onlineClubs: OnlineClub[];
}> = ({ isOpen, onOpenChange, entry, isSubmitting, onSubmit, onlineClubs }) => {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState('');
    const [onlineClubName, setOnlineClubName] = useState('');

    useEffect(() => {
        if (entry) {
            setAmount(String(entry.amount));
            setNotes(entry.notes);
            setDate(format(parseISO(entry.date), 'yyyy-MM-dd'));
            setOnlineClubName(entry.onlineClubName || '');
        }
    }, [entry]);

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || !notes || !onlineClubName) {
            alert('Please enter a valid amount, notes, and select an online club.');
            return;
        }
        onSubmit(entry.id, numAmount, notes, date, onlineClubName);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit P/L Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-pl-amount">Amount</Label>
                        <Input id="edit-pl-amount" type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-pl-date">Date</Label>
                        <Input id="edit-pl-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-online-club">Online Club</Label>
                        <Select value={onlineClubName} onValueChange={setOnlineClubName} required>
                            <SelectTrigger id="edit-online-club">
                                <SelectValue placeholder="Select an online club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {onlineClubs && onlineClubs.filter(c => c.name).length > 0 ? (
                                    onlineClubs.filter(c => c.name).map(club => (
                                        <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No online clubs found. An admin must create them in Settings.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-pl-notes">Notes</Label>
                        <Textarea id="edit-pl-notes" value={notes} onChange={e => setNotes(e.target.value)} required />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OnlineClubPage;
