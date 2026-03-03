

'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getOnlinePlayerAccounts, getOnlineLedgerEntries, recordTransaction, deleteAllOnlineDataForClub, deleteOnlinePlayerAccount, updateTransaction, deleteTransaction, getOnlineClubs, getAllOnlineLedgerEntries } from '@/services/online-club-service';
import { getClubs } from '@/services/club-service';
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, Club, OnlineClub } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Minus, Landmark, Search, Trash2, Edit, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendDeleteOnlineAccountOtp } from '@/ai/flows/send-delete-online-account-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminOnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [accounts, setAccounts] = useState<OnlinePlayerAccount[]>([]);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [allOnlineClubs, setAllOnlineClubs] = useState<OnlineClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [allLedgerEntries, setAllLedgerEntries] = useState<OnlineLedgerEntry[]>([]);
    
    // Filtering and Dialog states
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isLedgerModalOpen, setLedgerModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<OnlinePlayerAccount | null>(null);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [playerLedger, setPlayerLedger] = useState<OnlineLedgerEntry[]>([]);
    const [isDeletingPlayer, setIsDeletingPlayer] = useState(false);
    const [isEditTransactionModalOpen, setEditTransactionModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<OnlineLedgerEntry | null>(null);

    const [playerToDelete, setPlayerToDelete] = useState<OnlinePlayerAccount | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            const isSuper = user.whatsappNumber === '919843350000';
            setIsSuperAdmin(isSuper);
            
            if (isSuper) {
                setSelectedClubId('all');
            } else if (user.clubId) {
                setSelectedClubId(user.clubId);
            }

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
        setIsLoading(true);
        try {
            const [playerAccounts, clubs, onlineClubs, allEntries] = await Promise.all([
                getOnlinePlayerAccounts(),
                isSuperAdmin ? getClubs() : Promise.resolve([]),
                getOnlineClubs(),
                getAllOnlineLedgerEntries(),
            ]);
            setAccounts(playerAccounts);
            setAllClubs(clubs);
            setAllOnlineClubs(onlineClubs);
            setAllLedgerEntries(allEntries);
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

    const accountsWithClubBalances = useMemo(() => {
        if (!accounts.length) return [];
        
        return accounts.map(account => {
            const playerEntries = allLedgerEntries.filter(e => e.accountId === account.id);
            const clubBalances: Record<string, number> = {};
    
            playerEntries.forEach(entry => {
                if (entry.onlineClubName) {
                    if (!clubBalances[entry.onlineClubName]) {
                        clubBalances[entry.onlineClubName] = 0;
                    }
                    clubBalances[entry.onlineClubName] += entry.amount;
                }
            });
    
            return {
                ...account,
                clubBalances,
            };
        });
    }, [accounts, allLedgerEntries]);

    const filteredAccounts = useMemo(() => {
        return accountsWithClubBalances
            .filter(acc => {
                if (isSuperAdmin) {
                    return selectedClubId === 'all' || acc.clubId === selectedClubId;
                }
                // For regular admins, they should only see their club's accounts
                return acc.clubId === currentUser?.clubId;
            })
            .filter(acc => acc.playerName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [accountsWithClubBalances, selectedClubId, searchTerm, isSuperAdmin, currentUser]);

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
    
    const handleOpenEditTransaction = (entry: OnlineLedgerEntry) => {
        setEntryToEdit(entry);
        setEditTransactionModalOpen(true);
        setLedgerModalOpen(false); // Close ledger while editing
    };

    const handleDeleteTransaction = async (accountId: string, entryId: string) => {
        try {
            await deleteTransaction(accountId, entryId);
            toast({ title: 'Transaction Deleted' });
            // Refresh ledger
            const ledger = await getOnlineLedgerEntries(accountId);
            setPlayerLedger(ledger);
            // also refresh main accounts view
            await refreshData();
        } catch (e) {
            const error = e as Error;
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        }
    };
    
    const handleDeletePlayerAccount = async (accountId: string, playerName: string) => {
        setIsDeletingPlayer(true);
        try {
            await deleteOnlinePlayerAccount(accountId);
            toast({ title: "Account Deleted", description: `The account for ${playerName} has been deleted.` });
            await refreshData();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Could not delete player account.";
            toast({ variant: 'destructive', title: 'Deletion Failed', description: msg });
        } finally {
            setIsDeletingPlayer(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Landmark /> Online Club Admin</CardTitle>
                            <CardDescription>View balances and manage deposits/withdrawals for all players.</CardDescription>
                        </div>
                    </div>
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
                                    <TableCell className="text-right">
                                        <div className={`font-mono font-semibold text-lg mb-1 ${account.balance >= 0 ? '' : 'text-red-500'}`}>
                                            ₹{account.balance.toFixed(0)}
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                                            {Object.entries(account.clubBalances).map(([clubName, balance]) => (
                                                <div key={clubName} className="text-xs text-muted-foreground">
                                                    <span className="font-semibold">{clubName}:</span>
                                                    <span className={`font-mono ml-1 ${balance >= 0 ? '' : 'text-red-500'}`}>
                                                        ₹{balance.toFixed(0)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenTransaction(account, 'deposit')}><Plus className="h-4 w-4 mr-1" /> Deposit</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenTransaction(account, 'withdrawal')}><Minus className="h-4 w-4 mr-1" /> Withdraw</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenLedger(account)}>Ledger</Button>
                                        <Button size="icon" variant="destructive" onClick={() => {
                                            setPlayerToDelete(account);
                                            setDeleteModalOpen(true);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
                        onlineClubs={allOnlineClubs.filter(oc => oc.clubId === selectedAccount.clubId)}
                    />
                    <LedgerDialog
                        isOpen={isLedgerModalOpen}
                        onOpenChange={setLedgerModalOpen}
                        account={selectedAccount}
                        ledger={playerLedger}
                        onEditTransaction={handleOpenEditTransaction}
                        onDeleteTransaction={handleDeleteTransaction}
                        onlineClubs={allOnlineClubs.filter(oc => oc.clubId === selectedAccount.clubId)}
                    />
                    {entryToEdit && (
                        <EditTransactionDialog
                            isOpen={isEditTransactionModalOpen}
                            onOpenChange={(open) => {
                                setEditTransactionModalOpen(open);
                                if (!open) {
                                    setEntryToEdit(null);
                                    setLedgerModalOpen(true);
                                }
                            }}
                            entry={entryToEdit}
                            onSuccess={async () => {
                                await refreshData();
                                const ledger = await getOnlineLedgerEntries(selectedAccount.id);
                                setPlayerLedger(ledger);
                                setLedgerModalOpen(true);
                            }}
                            onlineClubs={allOnlineClubs.filter(oc => oc.clubId === selectedAccount.clubId)}
                        />
                    )}
                </>
            )}

            {playerToDelete && (
                <DeleteAccountDialog
                    isOpen={isDeleteModalOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            setPlayerToDelete(null);
                        }
                        setDeleteModalOpen(open);
                    }}
                    account={playerToDelete}
                    clubName={allClubs.find(c => c.id === playerToDelete.clubId)?.name || 'N/A'}
                    onConfirmDelete={handleDeletePlayerAccount}
                    toast={toast}
                />
            )}
        </div>
    );
};

const DeleteAccountDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: OnlinePlayerAccount;
    clubName: string;
    onConfirmDelete: (accountId: string, playerName: string) => void;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, account, clubName, onConfirmDelete, toast }) => {
    const [otp, setOtp] = useState('');
    const [sentOtp, setSentOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setOtp('');
            setSentOtp('');
            setIsOtpSent(false);
            setIsSending(false);
            setIsDeleting(false);
        }
    }, [isOpen]);

    const handleSendOtp = async () => {
        setIsSending(true);
        try {
            const result = await sendDeleteOnlineAccountOtp({
                playerName: account.playerName,
                clubName: clubName,
            });
            if (result.success && result.otp) {
                setSentOtp(result.otp);
                setIsOtpSent(true);
                toast({ title: "OTP Sent", description: "An OTP has been sent to the Super Admin's WhatsApp." });
            } else {
                throw new Error(result.error || 'Failed to send OTP.');
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'OTP Error', description: e.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = () => {
        if (otp !== sentOtp) {
            toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The entered code is incorrect.' });
            return;
        }
        setIsDeleting(true);
        onConfirmDelete(account.id, account.playerName);
        setIsDeleting(false);
        onOpenChange(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {account.playerName}'s Online Account?</DialogTitle>
                    <DialogDescription>
                        {isOtpSent 
                            ? "Enter the OTP sent to the Super Admin to confirm deletion."
                            : "This will permanently delete the online account and all associated transaction history. An OTP will be sent to the Super Admin to confirm this critical action."
                        }
                    </DialogDescription>
                </DialogHeader>

                {isOtpSent ? (
                    <div className="py-4 space-y-2">
                        <Label htmlFor="delete-otp">Super Admin OTP</Label>
                        <Input
                            id="delete-otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="4-digit code"
                        />
                    </div>
                ) : null}

                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    {!isOtpSent ? (
                        <Button variant="destructive" onClick={handleSendOtp} disabled={isSending}>
                            {isSending ? <Loader2 className="animate-spin mr-2" /> : null}
                            Send Deletion OTP
                        </Button>
                    ) : (
                         <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !otp}>
                            {isDeleting ? <Loader2 className="animate-spin mr-2" /> : null}
                            Confirm & Delete Account
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const TransactionDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: OnlinePlayerAccount;
    type: 'deposit' | 'withdrawal';
    onSuccess: () => void;
    onlineClubs: OnlineClub[];
}> = ({ isOpen, onOpenChange, account, type, onSuccess, onlineClubs }) => {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onlineClubName, setOnlineClubName] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setPaymentMode('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setOnlineClubName('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid positive amount.' });
            return;
        }
        if (!paymentMode) {
            toast({ variant: 'destructive', title: 'Payment Mode Required', description: 'Please select a payment mode.' });
            return;
        }
        if (!onlineClubName) {
            toast({ variant: 'destructive', title: 'Online Club Required', description: 'Please select an online club.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await recordTransaction(account.id, type, numAmount, paymentMode, date, onlineClubName);
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
                    <DialogDescription>Current Balance: ₹{account.balance.toFixed(0)}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tx-amount">Amount</Label>
                        <Input id="tx-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tx-date">Date</Label>
                        <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tx-payment-mode">Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger id="tx-payment-mode">
                                <SelectValue placeholder="Select a payment mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Google Pay">Google Pay</SelectItem>
                                <SelectItem value="Net Banking">Net Banking</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tx-online-club">Online Club</Label>
                        <Select value={onlineClubName} onValueChange={setOnlineClubName}>
                            <SelectTrigger id="tx-online-club">
                                <SelectValue placeholder="Select an online club" />
                            </SelectTrigger>
                            <SelectContent>
                                {onlineClubs && onlineClubs.length > 0 ? (
                                    onlineClubs.map(club => (
                                        <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No online clubs found for this club.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
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
    onEditTransaction: (entry: OnlineLedgerEntry) => void;
    onDeleteTransaction: (accountId: string, entryId: string) => void;
    onlineClubs: OnlineClub[];
}> = ({ isOpen, onOpenChange, account, ledger, onEditTransaction, onDeleteTransaction, onlineClubs }) => {
    const [activeTab, setActiveTab] = useState('all');

    const balanceByClub = useMemo(() => {
        if (!ledger || !onlineClubs) return [];
    
        const balances: { [key: string]: number } = {};
    
        onlineClubs.forEach(club => {
            if(club.name) {
                balances[club.name] = 0;
            }
        });
    
        ledger.forEach(entry => {
            if (entry.onlineClubName) {
                if (balances[entry.onlineClubName] === undefined) {
                    balances[entry.onlineClubName] = 0;
                }
                balances[entry.onlineClubName] += entry.amount;
            }
        });
    
        return Object.entries(balances).map(([name, balance]) => ({ name, balance })).sort((a,b) => a.name.localeCompare(b.name));
    }, [ledger, onlineClubs]);

    const filteredLedger = useMemo(() => {
        if (activeTab === 'all') {
            return ledger;
        }
        return ledger.filter(entry => entry.onlineClubName === activeTab);
    }, [ledger, activeTab]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Transaction Ledger for {account.playerName}</DialogTitle>
                    <DialogDescription>Balances by online club and complete transaction history.</DialogDescription>
                </DialogHeader>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Balances by Online Club</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 grid-cols-2 md:grid-cols-3">
                        {balanceByClub.map(clubBalance => (
                            <div key={clubBalance.name} className="p-2 rounded-lg border">
                                <p className="text-xs text-muted-foreground">{clubBalance.name}</p>
                                <p className={`text-lg font-bold ${clubBalance.balance >= 0 ? '' : 'text-red-500'}`}>
                                    ₹{clubBalance.balance.toFixed(0)}
                                </p>
                            </div>
                        ))}
                        {balanceByClub.length === 0 && (
                            <p className="text-muted-foreground col-span-full text-center py-4 text-sm">No balances to show.</p>
                        )}
                    </CardContent>
                </Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        {onlineClubs.map(club => (
                            <TabsTrigger key={club.id} value={club.name}>{club.name}</TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value={activeTab} className="mt-4">
                        <ScrollArea className="h-80 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Online Club</TableHead>
                                        <TableHead>Payment Mode / Notes</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLedger.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="capitalize">{entry.type}</TableCell>
                                            <TableCell>{entry.onlineClubName || '-'}</TableCell>
                                            <TableCell>{entry.notes}</TableCell>
                                            <TableCell className={`text-right font-mono ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {entry.amount >= 0 ? '+' : ''}₹{entry.amount.toFixed(0)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">₹{entry.runningBalance.toFixed(0)}</TableCell>
                                            <TableCell className="text-right">
                                                {entry.type !== 'p/l' && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => onEditTransaction(entry)}><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete this {entry.type} of ₹{Math.abs(entry.amount).toFixed(0)}. This action cannot be undone.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => onDeleteTransaction(account.id, entry.id)}>Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredLedger.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24">No transactions for this view.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const EditTransactionDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    entry: OnlineLedgerEntry;
    onSuccess: () => void;
    onlineClubs: OnlineClub[];
}> = ({ isOpen, onOpenChange, entry, onSuccess, onlineClubs }) => {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [date, setDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onlineClubName, setOnlineClubName] = useState('');
    
    useEffect(() => {
        if (isOpen && entry) {
            setAmount(String(Math.abs(entry.amount)));
            setPaymentMode(entry.notes);
            setDate(format(parseISO(entry.date), 'yyyy-MM-dd'));
            setOnlineClubName(entry.onlineClubName || '');
        }
    }, [isOpen, entry]);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }
        if (!paymentMode) {
            toast({ variant: 'destructive', title: 'Payment Mode Required' });
            return;
        }
        if (!onlineClubName) {
            toast({ variant: 'destructive', title: 'Online Club Required' });
            return;
        }
        setIsSubmitting(true);
        try {
            await updateTransaction(entry.accountId, entry.id, numAmount, paymentMode, date, onlineClubName);
            toast({ title: 'Success', description: `Transaction updated.` });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            const msg = error instanceof Error ? error.message : `Could not update transaction.`;
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="capitalize">Edit {entry.type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-tx-amount">Amount</Label>
                        <Input id="edit-tx-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-tx-date">Date</Label>
                        <Input id="edit-tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-tx-payment-mode">Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger id="edit-tx-payment-mode">
                                <SelectValue placeholder="Select a payment mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Google Pay">Google Pay</SelectItem>
                                <SelectItem value="Net Banking">Net Banking</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-tx-online-club">Online Club</Label>
                        <Select value={onlineClubName} onValueChange={setOnlineClubName}>
                            <SelectTrigger id="edit-tx-online-club">
                                <SelectValue placeholder="Select an online club" />
                            </SelectTrigger>
                            <SelectContent>
                                {onlineClubs && onlineClubs.length > 0 ? (
                                    onlineClubs.map(club => (
                                        <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No online clubs found.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default AdminOnlineClubPage;
