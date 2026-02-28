
'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getOnlinePlayerAccounts, getOnlineLedgerEntries, recordTransaction } from '@/services/online-club-service';
import { getClubs } from '@/services/club-service';
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Minus, Landmark, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const AdminOnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [accounts, setAccounts] = useState<OnlinePlayerAccount[]>([]);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    
    // Filtering and Dialog states
    const [selectedClubId, setSelectedClubId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isLedgerModalOpen, setLedgerModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<OnlinePlayerAccount | null>(null);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [playerLedger, setPlayerLedger] = useState<OnlineLedgerEntry[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            setIsSuperAdmin(user.whatsappNumber === '919843350000');
            if (!user.isAdmin) {
                toast({ variant: 'destructive', title: 'Access Denied' });
                router.push('/dashboard');
            }
        } else {
            router.push('/login');
        }
    }, [router, toast]);
    
    const refreshData = async () => {
        if (!currentUser) return;
        try {
            const [playerAccounts, clubs] = await Promise.all([
                getOnlinePlayerAccounts(),
                isSuperAdmin ? getClubs() : Promise.resolve([])
            ]);
            setAccounts(playerAccounts);
            setAllClubs(clubs);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load account data.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.isAdmin) {
            refreshData();
        }
    }, [currentUser]);

    const filteredAccounts = useMemo(() => {
        return accounts
            .filter(acc => (selectedClubId === 'all' || acc.clubId === selectedClubId))
            .filter(acc => acc.playerName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [accounts, selectedClubId, searchTerm]);

    const handleOpenTransaction = (account: OnlinePlayerAccount, type: 'deposit' | 'withdrawal') => {
        setSelectedAccount(account);
        setTransactionType(type);
        setTransactionModalOpen(true);
    };
    
    const handleOpenLedger = async (account: OnlinePlayerAccount) => {
        setSelectedAccount(account);
        try {
            const ledger = await getOnlineLedgerEntries(account.id);
            setPlayerLedger(ledger);
            setLedgerModalOpen(true);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to load player ledger.' });
        }
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark /> Online Club Admin</CardTitle>
                    <CardDescription>View balances and manage deposits/withdrawals for all players.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        {isSuperAdmin && (
                            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Filter by club..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Clubs</SelectItem>
                                    {allClubs.map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by player name..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                {isSuperAdmin && <TableHead>Club</TableHead>}
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.map(account => (
                                <TableRow key={account.id}>
                                    <TableCell className="font-medium">{account.playerName}</TableCell>
                                    {isSuperAdmin && <TableCell>{allClubs.find(c=> c.id === account.clubId)?.name || 'N/A'}</TableCell>}
                                    <TableCell className={`text-right font-mono font-semibold ${account.balance >= 0 ? '' : 'text-red-500'}`}>
                                        ₹{account.balance.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenTransaction(account, 'deposit')}><Plus className="h-4 w-4 mr-1" /> Deposit</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenTransaction(account, 'withdrawal')}><Minus className="h-4 w-4 mr-1" /> Withdraw</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenLedger(account)}>Ledger</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedAccount && (
                <>
                    <TransactionDialog 
                        isOpen={isTransactionModalOpen}
                        onOpenChange={setTransactionModalOpen}
                        account={selectedAccount}
                        type={transactionType}
                        onSuccess={refreshData}
                    />
                    <LedgerDialog
                        isOpen={isLedgerModalOpen}
                        onOpenChange={setLedgerModalOpen}
                        account={selectedAccount}
                        ledger={playerLedger}
                    />
                </>
            )}
        </div>
    );
};

const TransactionDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: OnlinePlayerAccount;
    type: 'deposit' | 'withdrawal';
    onSuccess: () => void;
}> = ({ isOpen, onOpenChange, account, type, onSuccess }) => {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid positive amount.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await recordTransaction(account.id, type, numAmount, notes);
            toast({ title: 'Success', description: `Transaction recorded for ${account.playerName}.` });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            const msg = error instanceof Error ? error.message : `Could not record ${type}.`;
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="capitalize">{type} for {account.playerName}</DialogTitle>
                    <DialogDescription>Current Balance: ₹{account.balance.toFixed(2)}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tx-amount">Amount</Label>
                        <Input id="tx-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tx-notes">Notes (Optional)</Label>
                        <Textarea id="tx-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bank Transfer, GPay" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : (type === 'deposit' ? <Plus className="mr-2" /> : <Minus className="mr-2" />)}
                        Confirm {type}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const LedgerDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: OnlinePlayerAccount;
    ledger: OnlineLedgerEntry[];
}> = ({ isOpen, onOpenChange, account, ledger }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Transaction Ledger for {account.playerName}</DialogTitle>
                    <DialogDescription>Complete history of all account transactions.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Online Club</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
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
                                </TableRow>
                            ))}
                             {ledger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No transactions.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default AdminOnlineClubPage;
