

'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getOnlinePlayerAccounts, getOnlineLedgerEntries, recordTransaction, deleteAllOnlineDataForClub, deleteOnlinePlayerAccount, updateTransaction, deleteTransaction, getOnlineClubs, getAllOnlineLedgerEntries, addProfitLoss, deleteMultipleOnlinePlayerAccounts } from '@/services/online-club-service';
import { getClubs, getClub } from '@/services/club-service';
import { getMasterPlayers } from '@/services/player-service';
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, Club, OnlineClub } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Minus, Landmark, Search, Trash2, Edit, Save, ChevronsUpDown, Check, MessageSquare, Send, Copy, Shield, FileDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendDeleteOnlineAccountOtp } from '@/ai/flows/send-delete-online-account-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendWhatsappMessage } from '@/ai/flows/send-whatsapp-message';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';


const SUPER_ADMIN_WHATSAPP = '919843350000';

const PlayerCombobox: FC<{
    accounts: OnlinePlayerAccount[];
    selectedId: string;
    onSelect: (id: string) => void;
}> = ({ accounts, selectedId, onSelect }) => {
    const [open, setOpen] = useState(false);
    const selectedName = accounts.find(acc => acc.id === selectedId)?.playerName || "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selectedId ? selectedName : "Select a player..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search player..." />
                    <CommandEmpty>No player found.</CommandEmpty>
                    <CommandList>
                        <ScrollArea className="h-48">
                            {accounts.map(account => (
                                <CommandItem
                                    key={account.id}
                                    value={account.playerName}
                                    onSelect={() => {
                                        onSelect(account.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedId === account.id ? "opacity-100" : "opacity-0")} />
                                    {account.playerName}
                                </CommandItem>
                            ))}
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const RecordPlayerPLCard: FC<{
    accounts: OnlinePlayerAccount[];
    onlineClubs: OnlineClub[];
    onSuccess: () => void;
    allPlayers: MasterPlayer[];
}> = ({ accounts, onlineClubs, onSuccess, allPlayers }) => {
    const { toast } = useToast();
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [onlineClubName, setOnlineClubName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const allOnlinePlayers = useMemo(() => {
        const playerMap = new Map(allPlayers.map(p => [p.id, p]));
        const onlinePlayerIds = new Set(onlineClubs.flatMap(oc => oc.eligiblePlayerIds || []));
        if (onlinePlayerIds.size === 0) { // If no players are explicitly assigned, all are eligible
            return allPlayers.filter(p => p.isActive).sort((a,b) => a.name.localeCompare(b.name));
        }
        return allPlayers.filter(p => onlinePlayerIds.has(p.id) && p.isActive)
            .sort((a,b) => a.name.localeCompare(b.name));

    }, [allPlayers, onlineClubs]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!selectedAccountId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a player.' });
            return;
        }
        if (isNaN(numAmount)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid amount.' });
            return;
        }
        if (!onlineClubName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an online club.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addProfitLoss(selectedAccountId, numAmount, date, onlineClubName);
            toast({ title: 'Success', description: `P/L of ${numAmount} recorded for the selected player.` });
            // Reset form
            setSelectedAccountId('');
            setAmount('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setOnlineClubName('');
            onSuccess(); // To refresh the main accounts list
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not record P/L.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const selectedAccount = useMemo(() => 
        allPlayers.find(acc => acc.id === selectedAccountId)
    , [selectedAccountId, allPlayers]);

    const availableOnlineClubs = useMemo(() => {
        if (!selectedAccount) return [];
        
        const eligibleClubs = onlineClubs.filter(oc => {
            if (!oc.eligiblePlayerIds || oc.eligiblePlayerIds.length === 0) {
                return true;
            }
            return oc.eligiblePlayerIds.includes(selectedAccount.id);
        });
        
        return eligibleClubs.length > 0 ? eligibleClubs : onlineClubs;
    }, [selectedAccount, onlineClubs]);
    
    // reset online club if player changes and it's no longer valid
    useEffect(() => {
        if (selectedAccount && !availableOnlineClubs.some(oc => oc.name === onlineClubName)) {
            setOnlineClubName('');
        }
    }, [selectedAccount, availableOnlineClubs, onlineClubName]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Record Player Profit/Loss</CardTitle>
                <CardDescription>Manually enter a P/L entry for any player in any online club.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Player</Label>
                        <PlayerCombobox 
                          accounts={allOnlinePlayers.map(p => ({
                            id: p.id, 
                            playerId: p.id, 
                            playerName: p.name, 
                            clubId: p.clubId, 
                            balance: 0, // not used in combobox
                            lastUpdated: '' // not used
                          }))} 
                          selectedId={selectedAccountId} 
                          onSelect={setSelectedAccountId} 
                        />
                    </div>
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
                        <Label htmlFor="pl-online-club">Online Club</Label>
                        <Select value={onlineClubName} onValueChange={setOnlineClubName} disabled={!selectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an online club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableOnlineClubs.length > 0 ? (
                                    availableOnlineClubs.map(club => (
                                        <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                        {selectedAccountId ? "No eligible online clubs for this player." : "Select a player first."}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
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


const AdminOnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [accounts, setAccounts] = useState<OnlinePlayerAccount[]>([]);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [allOnlineClubs, setAllOnlineClubs] = useState<OnlineClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [allLedgerEntries, setAllLedgerEntries] = useState<OnlineLedgerEntry[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [allPlayers, setAllPlayers] = useState<MasterPlayer[]>([]);
    
    // Filtering and Dialog states
    const [selectedClubId, setSelectedClubId] = useState<string>('all');
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
    
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);


    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [reportContext, setReportContext] = useState<{ account: OnlinePlayerAccount; onlineClub: OnlineClub; } | null>(null);

    const badgeColors = [
        "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
        "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
        "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    ];

    const onlineClubCurrencyMap = useMemo(() => {
        const map = new Map<string, string>();
        if (allOnlineClubs) {
            allOnlineClubs.forEach(club => {
                if (club.name && club.name.toLowerCase() === 'phoenix') {
                    map.set(club.name, 'Rs.');
                } else if (club.name) {
                    map.set(club.name, club.currency || '₹');
                }
            });
        }
        return map;
    }, [allOnlineClubs]);

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const isSuper = user.whatsappNumber === '919843350000';
            
            if (!isSuper) {
                toast({ variant: 'destructive', title: 'Access Denied', description: "Only Super Admins can manage online clubs." });
                router.push('/dashboard');
                return;
            }

            setCurrentUser(user);
        } else {
            router.push('/login');
        }
    }, [router, toast]);
    
    const refreshData = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [playerAccounts, masterPlayers, clubs, onlineClubs, allEntries] = await Promise.all([
                getOnlinePlayerAccounts(),
                getMasterPlayers(),
                getClubs(),
                getOnlineClubs(),
                getAllOnlineLedgerEntries(),
            ]);

            setAllPlayers(masterPlayers);
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
        if (currentUser) {
            refreshData();
        }
    }, [currentUser]);

    const accountsWithClubBalances = useMemo(() => {
        if (!accounts.length || !allLedgerEntries.length) return accounts.map(acc => ({...acc, clubBalances: {}}));
        
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
                return selectedClubId === 'all' || acc.clubId === selectedClubId;
            })
            .filter(acc => acc.playerName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [accountsWithClubBalances, selectedClubId, searchTerm]);
    
    const handleSelectAccount = (accountId: string, isSelected: boolean) => {
        setSelectedAccountIds(prev =>
            isSelected ? [...prev, accountId] : prev.filter(id => id !== accountId)
        );
    };

    const handleSelectAllAccounts = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedAccountIds(filteredAccounts.map(acc => acc.id));
        } else {
            setSelectedAccountIds([]);
        }
    };

    const handleConfirmBulkDelete = async (accountIds: string[]) => {
        try {
            await deleteMultipleOnlinePlayerAccounts(accountIds);
            toast({ title: 'Accounts Deleted', description: `${accountIds.length} accounts have been successfully removed.` });
            setSelectedAccountIds([]);
            await refreshData();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Could not delete selected accounts.";
            toast({ variant: 'destructive', title: 'Bulk Deletion Failed', description: msg });
        }
    };


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
        await deleteOnlinePlayerAccount(accountId);
        toast({ title: "Account Deleted", description: `The account for ${playerName} has been deleted.` });
        await refreshData();
    };

    const handleOpenReportModal = (account: OnlinePlayerAccount, onlineClub: OnlineClub) => {
        setReportContext({ account, onlineClub });
        setReportModalOpen(true);
    };

    const handleExportPdf = async (account: OnlinePlayerAccount) => {
        if (!account) {
            toast({
                variant: "destructive",
                title: "Export Error",
                description: "There is no account data to export.",
            });
            return;
        }
    
        setIsExporting(true);
    
        const ledger = allLedgerEntries.filter(e => e.accountId === account.id);
        
        const clubBalances: Record<string, number> = {};
        ledger.forEach(entry => {
            if (entry.onlineClubName) {
                if (!clubBalances[entry.onlineClubName]) {
                    clubBalances[entry.onlineClubName] = 0;
                }
                clubBalances[entry.onlineClubName] += entry.amount;
            }
        });
        const balanceByClub = Object.entries(clubBalances).map(([name, balance]) => ({
            name,
            balance,
            currency: onlineClubCurrencyMap.get(name) || '₹',
        })).sort((a,b) => a.name.localeCompare(b.name));
    
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 60;
    
            const FONT_PRIMARY = '#0a0a0a';
            const FONT_MUTED = '#737373';
            const POSITIVE_COLOR = '#16a34a';
            const NEGATIVE_COLOR = '#dc2626';
            const PRIMARY_BRAND_COLOR = '#4f46e5';

            const addPageFooter = () => {
                const pageCount = (doc as any).internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(FONT_MUTED);
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy, p')}`, 40, doc.internal.pageSize.getHeight() - 20);
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
                }
            };
            
            // --- HEADER ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(FONT_PRIMARY);
            doc.text('SETTLEMENT LEDGER', 40, yPos);
            yPos += 40;
    
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(FONT_MUTED);
            doc.text('PLAYER', 40, yPos);
            yPos += 15;
            doc.setFontSize(18);
            doc.setTextColor(FONT_PRIMARY);
            doc.text(account.playerName, 40, yPos);
    
            // --- BALANCE BADGES ---
            let currentX = pageWidth - 40;
            balanceByClub.slice().reverse().forEach(clubBalance => {
                const currencySymbol = onlineClubCurrencyMap.get(clubBalance.name) || '₹';
                const text = `${clubBalance.name}: ${currencySymbol}${clubBalance.balance.toFixed(0)}`;
                const textWidth = doc.getTextWidth(text);
                const badgeWidth = textWidth + 20;
    
                currentX -= (badgeWidth + 10);
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(currentX, yPos - 18, badgeWidth, 24, 8, 8, 'F');
                
                doc.setFontSize(10);
                doc.setTextColor(FONT_MUTED);
                doc.text(text, currentX + 10, yPos - 4);
            });
            yPos += 40;

            const calculateWeeklyData = (entries: OnlineLedgerEntry[]) => {
                if (entries.length === 0) return [];
                const sortedLedger = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const statements: {
                    week: string;
                    openingBalance: number;
                    entries: (OnlineLedgerEntry & { localRunningBalance: number })[];
                    closingBalance: number;
                }[] = [];

                if (sortedLedger.length > 0) {
                    let runningBalance = 0;
                    const earliestEntry = sortedLedger[0];
                    const firstWeekStart = startOfWeek(parseISO(earliestEntry.date), { weekStartsOn: 1 });
                    
                    let openingBalanceForFirstWeek = 0;
                    sortedLedger.forEach(entry => {
                        if (parseISO(entry.date) < firstWeekStart) {
                            openingBalanceForFirstWeek += entry.amount;
                        }
                    });
                    
                    runningBalance = openingBalanceForFirstWeek;

                    let weekEntries: OnlineLedgerEntry[] = [];
                    let currentWeekStart = firstWeekStart;

                    for (const entry of sortedLedger) {
                        const entryDate = parseISO(entry.date);
                        if (entryDate < firstWeekStart) continue;

                        if (!isSameWeek(entryDate, currentWeekStart, { weekStartsOn: 1 })) {
                            if (weekEntries.length > 0) {
                                const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
                                let weekRunningBalance = runningBalance;
                                const augmentedEntries = weekEntries.map(e => {
                                    weekRunningBalance += e.amount;
                                    return {...e, localRunningBalance: weekRunningBalance };
                                });
                                
                                statements.push({
                                    week: `${format(currentWeekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`,
                                    openingBalance: runningBalance,
                                    entries: augmentedEntries,
                                    closingBalance: weekRunningBalance
                                });
                                runningBalance = weekRunningBalance;
                            }
                            
                            currentWeekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
                            weekEntries = [entry];
                        } else {
                            weekEntries.push(entry);
                        }
                    }
                    
                    if (weekEntries.length > 0) {
                        let weekRunningBalance = runningBalance;
                        const augmentedEntries = weekEntries.map(e => {
                            weekRunningBalance += e.amount;
                            return {...e, localRunningBalance: weekRunningBalance };
                        });
                        
                        statements.push({
                            week: `${format(currentWeekStart, 'dd MMM')} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}`,
                            openingBalance: runningBalance,
                            entries: augmentedEntries,
                            closingBalance: weekRunningBalance
                        });
                    }
                }
                return statements;
            };
    
            // --- CLUB SECTIONS ---
            const clubsWithTransactions = Array.from(new Set(ledger.map(entry => entry.onlineClubName).filter(Boolean)));
            
            for (const clubName of clubsWithTransactions) {
                if (yPos > doc.internal.pageSize.getHeight() - 250) {
                    doc.addPage();
                    yPos = 60;
                }
    
                const clubEntries = ledger.filter(entry => entry.onlineClubName === clubName);
                const currencySymbol = onlineClubCurrencyMap.get(clubName) || '₹';

                // --- STATS SUMMARY ---
                const profit = clubEntries.filter(e => e.type === 'p/l' && e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
                const loss = clubEntries.filter(e => e.type === 'p/l' && e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
                const deposits = clubEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
                const withdrawals = clubEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(PRIMARY_BRAND_COLOR);
                doc.text(clubName, 40, yPos);
                yPos += 30;

                const statXPositions = [40, 160, 280, 400];
                doc.setFontSize(9);
                doc.setTextColor(FONT_MUTED);
                doc.text('PROFIT', statXPositions[0], yPos);
                doc.text('LOSS', statXPositions[1], yPos);
                doc.text('DEPOSITS', statXPositions[2], yPos);
                doc.text('WITHDRAWALS', statXPositions[3], yPos);
                yPos += 15;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                
                doc.setTextColor(POSITIVE_COLOR);
                doc.text(`${currencySymbol} ${profit.toFixed(0)}`, statXPositions[0], yPos);
                doc.setTextColor(NEGATIVE_COLOR);
                doc.text(`${currencySymbol} ${Math.abs(loss).toFixed(0)}`, statXPositions[1], yPos);
                doc.setTextColor(FONT_PRIMARY);
                doc.text(`${currencySymbol} ${deposits.toFixed(0)}`, statXPositions[2], yPos);
                doc.text(`${currencySymbol} ${Math.abs(withdrawals).toFixed(0)}`, statXPositions[3], yPos);
                
                yPos += 20;

                // --- TRANSACTIONS TABLE ---
                const weeklyStatements = calculateWeeklyData(clubEntries);
                if (weeklyStatements && weeklyStatements.length > 0) {
                    for (const week of [...weeklyStatements].reverse()) { // Show oldest first
                        if (yPos > doc.internal.pageSize.getHeight() - 150) {
                            doc.addPage();
                            yPos = 60;
                        }

                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(FONT_PRIMARY);
                        doc.text(week.week, 40, yPos);
                        yPos += 20;

                        (doc as any).autoTable({
                            startY: yPos,
                            head: [['Date', 'Type / Notes', 'Amount', 'Balance']],
                            body: [
                                [{ content: 'Opening Balance', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: `${currencySymbol}${week.openingBalance.toFixed(0)}`, styles: { halign: 'right', fontStyle: 'bold' } }],
                                ...week.entries.map(entry => {
                                    const typeText = entry.type === 'deposit' ? 'Deposit' : entry.type === 'withdrawal' ? 'Withdrawal' : (entry.amount >= 0 ? 'Profit' : 'Loss');
                                    const notesText = entry.notes ? ` - ${entry.notes}` : '';
                                    return [
                                        format(parseISO(entry.date), 'dd/MM/yyyy'),
                                        `${typeText}${notesText}`,
                                        { content: `${entry.amount >= 0 ? '+' : ''}${currencySymbol}${Math.abs(entry.amount).toFixed(0)}`, styles: { halign: 'right' } },
                                        { content: `${currencySymbol}${entry.localRunningBalance.toFixed(0)}`, styles: { halign: 'right' } }
                                    ];
                                })
                            ],
                            foot: [[
                                { content: 'Closing Balance', colSpan: 3, styles: { fontStyle: 'bold' } },
                                { content: `${currencySymbol}${week.closingBalance.toFixed(0)}`, styles: { halign: 'right', fontStyle: 'bold' } }
                            ]],
                            theme: 'striped',
                            styles: { font: 'helvetica', fontSize: 9, cellPadding: 6 },
                            headStyles: { textColor: FONT_PRIMARY, fontStyle: 'bold', fillColor: [241, 245, 249] },
                            footStyles: { textColor: FONT_PRIMARY, fontStyle: 'bold', fillColor: [241, 245, 249] },
                            didParseCell: (data: any) => {
                                if (data.column.index === 2 && data.row.section === 'body') {
                                    const entry = week.entries[data.row.index -1]; // -1 for opening balance row
                                    if(entry) data.cell.styles.textColor = entry.amount >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
                                }
                            },
                            didDrawPage: (data: any) => {
                                yPos = data.cursor.y;
                            }
                        });
                        yPos = (doc as any).lastAutoTable.finalY + 25;
                    }
                } else {
                    doc.setFontSize(10);
                    doc.setTextColor(FONT_MUTED);
                    doc.text('No transactions for this period.', 40, yPos);
                    yPos += 20;
                }
            }
            
            addPageFooter();
    
            const filename = `settlement-ledger-${account.playerName.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            doc.save(filename);
            toast({ title: 'PDF Exported', description: 'The player settlement ledger has been downloaded.' });
    
        } catch (error) {
            console.error("Could not export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "An error occurred while generating the PDF." });
        } finally {
            setIsExporting(false);
        }
    };


    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <RecordPlayerPLCard
                accounts={accounts}
                onlineClubs={allOnlineClubs}
                onSuccess={refreshData}
                allPlayers={allPlayers}
            />
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Landmark /> Online Club Admin</CardTitle>
                            <CardDescription>View balances and manage deposits/withdrawals for all players.</CardDescription>
                        </div>
                         {selectedAccountIds.length > 0 && (
                            <Button variant="destructive" onClick={() => setBulkDeleteModalOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Selected ({selectedAccountIds.length})
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by club..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clubs</SelectItem>
                                {allClubs.map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
                                <TableHead className="px-2 w-12">
                                    <Checkbox
                                        checked={filteredAccounts.length > 0 && selectedAccountIds.length === filteredAccounts.length}
                                        onCheckedChange={(checked) => handleSelectAllAccounts(!!checked)}
                                        aria-label="Select all accounts"
                                    />
                                </TableHead>
                                <TableHead>Player</TableHead>
                                <TableHead>Club</TableHead>
                                <TableHead className="text-right">Club Balances</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.map(account => (
                                <TableRow key={account.id}>
                                    <TableCell className="px-2">
                                        <Checkbox
                                            checked={selectedAccountIds.includes(account.id)}
                                            onCheckedChange={(checked) => handleSelectAccount(account.id, !!checked)}
                                            aria-label={`Select account for ${account.playerName}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{account.playerName}</TableCell>
                                    <TableCell>{allClubs.find(c=> c.id === account.clubId)?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {Object.entries(account.clubBalances).map(([clubName, balance], index) => {
                                                const currency = onlineClubCurrencyMap.get(clubName) || '₹';
                                                return (
                                                    <Badge key={clubName} variant="secondary" className={cn("font-semibold", badgeColors[index % badgeColors.length])}>
                                                        {clubName}: {currency}{balance.toFixed(0)}
                                                    </Badge>
                                                )
                                            })}
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
            
             <BulkDeleteAccountDialog
                isOpen={isBulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                accountsToDelete={accounts.filter(acc => selectedAccountIds.includes(acc.id))}
                onConfirmDelete={handleConfirmBulkDelete}
                toast={toast}
            />

            {selectedAccount && (
                <>
                    <TransactionDialog 
                        isOpen={isTransactionModalOpen}
                        onOpenChange={setTransactionModalOpen}
                        account={selectedAccount}
                        type={transactionType}
                        onSuccess={refreshData}
                        onlineClubs={allOnlineClubs}
                    />
                    <LedgerDialog
                        isOpen={isLedgerModalOpen}
                        onOpenChange={setLedgerModalOpen}
                        account={selectedAccount}
                        ledger={playerLedger}
                        onEditTransaction={handleOpenEditTransaction}
                        onDeleteTransaction={handleDeleteTransaction}
                        onlineClubs={allOnlineClubs}
                        onOpenReportModal={handleOpenReportModal}
                        onExportPdf={() => selectedAccount && handleExportPdf(selectedAccount)}
                        isExporting={isExporting}
                        onlineClubCurrencyMap={onlineClubCurrencyMap}
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
                            onlineClubs={allOnlineClubs}
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
            {reportContext && (
                <SendAdminReportDialog
                    isOpen={isReportModalOpen}
                    onOpenChange={setReportModalOpen}
                    player={reportContext.account}
                    onlineClub={reportContext.onlineClub}
                    club={allClubs.find(c => c.id === reportContext.account.clubId) || null}
                    ledger={playerLedger}
                    toast={toast}
                />
            )}
        </div>
    );
};

const BulkDeleteAccountDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    accountsToDelete: OnlinePlayerAccount[];
    onConfirmDelete: (accountIds: string[]) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, accountsToDelete, onConfirmDelete, toast }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirmDelete(accountsToDelete.map(a => a.id));
            onOpenChange(false);
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {accountsToDelete.length} Online Accounts?</DialogTitle>
                    <DialogDescription>
                        This will permanently delete the online accounts and all transaction history for the selected players. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-40 my-4 border rounded-md p-2">
                    <p className="text-sm font-medium">Players to be deleted:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {accountsToDelete.map(acc => <li key={acc.id}>{acc.playerName}</li>)}
                    </ul>
                </ScrollArea>

                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="animate-spin mr-2" /> : null}
                        Confirm & Delete Accounts
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const DeleteAccountDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: OnlinePlayerAccount;
    clubName: string;
    onConfirmDelete: (accountId: string, playerName: string) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, account, clubName, onConfirmDelete, toast }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirmDelete(account.id, account.playerName);
            onOpenChange(false);
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {account.playerName}'s Online Account?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the online account and all associated transaction history.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="animate-spin mr-2" /> : null}
                        Confirm & Delete Account
                    </Button>
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
    onOpenReportModal: (account: OnlinePlayerAccount, onlineClub: OnlineClub) => void;
    onExportPdf: () => void;
    isExporting: boolean;
    onlineClubCurrencyMap: Map<string, string>;
}> = ({ isOpen, onOpenChange, account, ledger, onEditTransaction, onDeleteTransaction, onlineClubs, onOpenReportModal, onExportPdf, isExporting, onlineClubCurrencyMap }) => {
    const [activeTab, setActiveTab] = useState('all');

    const balanceByClub = useMemo(() => {
        if (!ledger || !onlineClubs) return [];
    
        const balances: { [key: string]: { balance: number; currency: string; } } = {};
    
        onlineClubs.forEach(club => {
            if(club.name) {
                const currency = club.name.toLowerCase() === 'phoenix' ? 'Rs.' : (club.currency || '₹');
                balances[club.name] = { balance: 0, currency };
            }
        });
    
        ledger.forEach(entry => {
            if (entry.onlineClubName) {
                if (balances[entry.onlineClubName] === undefined) {
                    const club = onlineClubs.find(c => c.name === entry.onlineClubName);
                    const currency = club?.name?.toLowerCase() === 'phoenix' ? 'Rs.' : (club?.currency || '₹');
                    balances[entry.onlineClubName] = { balance: 0, currency };
                }
                balances[entry.onlineClubName].balance += entry.amount;
            }
        });
    
        return Object.entries(balances).map(([name, data]) => ({ name, ...data })).sort((a,b) => a.name.localeCompare(b.name));
    }, [ledger, onlineClubs]);

    const filteredLedger = useMemo(() => {
        if (activeTab === 'all') {
            return ledger;
        }
        return ledger.filter(entry => entry.onlineClubName === activeTab);
    }, [ledger, activeTab]);

    const activeOnlineClub = onlineClubs.find(oc => oc.name === activeTab);
    
    const currencyForLedger = useMemo(() => {
        if (activeTab === 'all') return '₹'; // Default for all tab
        const club = onlineClubs.find(oc => oc.name === activeTab);
        if (club?.name?.toLowerCase() === 'phoenix') return 'Rs.';
        return club?.currency || '₹';
    }, [activeTab, onlineClubs]);

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
                                    {clubBalance.currency}{clubBalance.balance.toFixed(0)}
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
                        {activeTab !== 'all' && activeOnlineClub && (
                            <div className="flex justify-end mb-4">
                                <Button onClick={() => onOpenReportModal(account, activeOnlineClub)}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> Send Report
                                </Button>
                            </div>
                        )}
                        <AdminWeeklyLedgerAccordion
                            entries={filteredLedger}
                            onlineClubCurrencyMap={onlineClubCurrencyMap}
                            onEditEntry={onEditTransaction}
                            onDeleteEntry={onDeleteTransaction}
                            currencySymbol={currencyForLedger}
                            activeTab={activeTab}
                            accountId={account.id}
                        />
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button onClick={onExportPdf} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Export PDF
                    </Button>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const SendAdminReportDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    player: OnlinePlayerAccount;
    onlineClub: OnlineClub;
    club: Club | null;
    ledger: OnlineLedgerEntry[];
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, player, onlineClub, club, ledger, toast }) => {
    const [isSendingGroup, setIsSendingGroup] = useState(false);
    const [isSendingAdmin, setIsSendingAdmin] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const weeklyData = useMemo(() => {
        if (!onlineClub) return [];
        const entries = ledger.filter(e => e.onlineClubName === onlineClub.name);
        if (entries.length === 0) return [];
    
        const sortedLedger = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
        const statements: {
            week: string;
            openingBalance: number;
            entries: (OnlineLedgerEntry & { localRunningBalance: number })[];
            closingBalance: number;
        }[] = [];
    
        if (sortedLedger.length > 0) {
            let runningBalance = 0;
            const earliestEntry = sortedLedger[0];
            const firstWeekStart = startOfWeek(parseISO(earliestEntry.date), { weekStartsOn: 1 });
            
            let openingBalanceForFirstWeek = 0;
            sortedLedger.forEach(entry => {
                if (parseISO(entry.date) < firstWeekStart) {
                    openingBalanceForFirstWeek += entry.amount;
                }
            });
            
            runningBalance = openingBalanceForFirstWeek;

            let weekEntries: OnlineLedgerEntry[] = [];
            let currentWeekStart = firstWeekStart;
    
            for (const entry of sortedLedger) {
                const entryDate = parseISO(entry.date);
    
                if (entryDate < firstWeekStart) continue;
    
                if (!isSameWeek(entryDate, currentWeekStart, { weekStartsOn: 1 })) {
                    if (weekEntries.length > 0) {
                        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
                        let weekRunningBalance = runningBalance;
                        const augmentedEntries = weekEntries.map(e => {
                            weekRunningBalance += e.amount;
                            return {...e, localRunningBalance: weekRunningBalance };
                        });
                        
                        statements.push({
                            week: `${format(currentWeekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`,
                            openingBalance: runningBalance,
                            entries: augmentedEntries,
                            closingBalance: weekRunningBalance
                        });
                        runningBalance = weekRunningBalance;
                    }
                    
                    currentWeekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
                    weekEntries = [entry];
                } else {
                    weekEntries.push(entry);
                }
            }
            
            if (weekEntries.length > 0) {
                let weekRunningBalance = runningBalance;
                const augmentedEntries = weekEntries.map(e => {
                    weekRunningBalance += e.amount;
                    return {...e, localRunningBalance: weekRunningBalance };
                });
                
                statements.push({
                    week: `${format(currentWeekStart, 'dd MMM')} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}`,
                    openingBalance: runningBalance,
                    entries: augmentedEntries,
                    closingBalance: weekRunningBalance
                });
            }
        }
        return statements.reverse();
    }, [ledger, onlineClub]);

    const message = useMemo(() => {
        if (!onlineClub || !weeklyData || weeklyData.length === 0 || !player) return 'No data to send.';
        
        let msg = `*Statement for ${player.playerName}*\n`;
        msg += `_Online Club: ${onlineClub.name}_\n`;
        if (club?.name) {
          msg += `_Club: ${club.name}_\n\n`;
        }
    
        [...weeklyData].reverse().forEach(week => {
            const currencySymbol = onlineClub.currency || '₹';
            msg += `*${week.week}*\n`;
            msg += `Opening Balance: *${currencySymbol}${week.openingBalance.toFixed(0)}*\n`;
            msg += `----------------------------------\n`;
    
            week.entries.forEach(entry => {
                const date = format(parseISO(entry.date), 'dd MMM');
                let description = '';
                if (entry.type === 'deposit') {
                    description = `Deposit via ${entry.notes}`;
                } else if (entry.type === 'withdrawal') {
                    description = `Withdrawal via ${entry.notes}`;
                } else {
                     description = entry.amount >= 0 ? 'Profit' : 'Loss';
                }

                const sign = entry.amount >= 0 ? '+' : '-';
                const amount = `${sign} ${currencySymbol}${Math.abs(entry.amount).toFixed(0)}`;
                const balance = `${currencySymbol}${entry.localRunningBalance.toFixed(0)}`;
    
                msg += `*${date}* - ${description}\n`;
                msg += `  \`${amount}\`  (Balance: \`${balance}\`)\n\n`;
            });
            
            msg += `----------------------------------\n`;
            msg += `Closing Balance: *${currencySymbol}${week.closingBalance.toFixed(0)}*\n\n`;
        });
        
        return msg.trim();
    }, [onlineClub, club, weeklyData, player]);

    const handleSendToGroup = async () => {
        if (!onlineClub?.whatsappGroupId) {
            toast({ variant: 'destructive', title: 'Group ID Missing', description: `No WhatsApp Group ID configured for ${onlineClub.name}.`});
            return;
        }

        setIsSendingGroup(true);
        try {
            // Not passing API credentials forces the flow to use environment variables (Super Admin's settings).
            const result = await sendWhatsappMessage({
                to: onlineClub.whatsappGroupId,
                message: message,
                isGroup: true,
            });
            if (result && result.success) {
                toast({ title: 'Report Sent!', description: `The summary for ${onlineClub.name} has been sent.` });
                onOpenChange(false);
            } else {
                throw new Error(result?.error || 'Failed to send report. The server did not provide an error message.');
            }
        } catch (e) {
            const error = e as Error;
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSendingGroup(false);
        }
    };
    
    const handleSendToAdmin = async () => {
        if (!message || message === 'No data to send.') {
             toast({ variant: 'destructive', title: 'No Data', description: "There is no report to send." });
             return;
        }
        setIsSendingAdmin(true);
        try {
            const result = await sendWhatsappMessage({
                to: SUPER_ADMIN_WHATSAPP,
                message: message,
                isGroup: false, // sending to a person
            });
            if (result && result.success) {
                toast({ title: 'Report Sent!', description: `The summary has been sent to the Super Admin.` });
            } else {
                throw new Error(result?.error || 'Failed to send report. The server did not provide an error message.');
            }
        } catch (e) {
            const error = e as Error;
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSendingAdmin(false);
        }
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(message).then(() => {
            setIsCopied(true);
            toast({ title: 'Copied!', description: 'Report message copied to clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Send Report</DialogTitle>
                    <DialogDescription>A statement for "{player?.playerName}" will be sent.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertTitle>Using Super Admin Credentials</AlertTitle>
                        <AlertDescription>
                            This message will be sent using the system's central WhatsApp API settings.
                        </AlertDescription>
                    </Alert>
                    <div className="flex justify-between items-center pt-2">
                        <Label>Message Preview</Label>
                        <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}>
                            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <ScrollArea className="h-64 border rounded-md p-4 bg-muted">
                        <pre className="text-sm whitespace-pre-wrap">{message}</pre>
                    </ScrollArea>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button onClick={handleSendToGroup} variant="secondary" disabled={isSendingGroup || isSendingAdmin || !onlineClub?.whatsappGroupId}>
                        {isSendingGroup ? <Loader2 className="animate-spin mr-2" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Send to Group
                    </Button>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button variant="outline" disabled={isSendingGroup || isSendingAdmin}>Cancel</Button></DialogClose>
                        <Button onClick={handleSendToAdmin} disabled={isSendingGroup || isSendingAdmin}>
                            {isSendingAdmin ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                            Send to Admin
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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

const AdminWeeklyLedgerAccordion: FC<{
    entries: OnlineLedgerEntry[],
    onlineClubCurrencyMap: Map<string, string>,
    onEditEntry: (entry: OnlineLedgerEntry) => void,
    onDeleteEntry: (accountId: string, entryId: string) => void,
    currencySymbol?: string,
    activeTab: string,
    accountId: string,
}> = ({ entries, onlineClubCurrencyMap, onEditEntry, onDeleteEntry, currencySymbol, activeTab, accountId }) => {
    
    const weeklyData = useMemo(() => {
        if (entries.length === 0) return [];
    
        const sortedLedger = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
        const statements: {
            week: string;
            openingBalance: number;
            entries: (OnlineLedgerEntry & { localRunningBalance: number })[];
            closingBalance: number;
        }[] = [];
    
        if (sortedLedger.length > 0) {
            let runningBalance = 0;
            const earliestEntry = sortedLedger[0];
            const firstWeekStart = startOfWeek(parseISO(earliestEntry.date), { weekStartsOn: 1 });
            
            let openingBalanceForFirstWeek = 0;
            sortedLedger.forEach(entry => {
                if (parseISO(entry.date) < firstWeekStart) {
                    openingBalanceForFirstWeek += entry.amount;
                }
            });
            
            runningBalance = openingBalanceForFirstWeek;

            let weekEntries: OnlineLedgerEntry[] = [];
            let currentWeekStart = firstWeekStart;
    
            for (const entry of sortedLedger) {
                const entryDate = parseISO(entry.date);
    
                if (entryDate < firstWeekStart) continue;
    
                if (!isSameWeek(entryDate, currentWeekStart, { weekStartsOn: 1 })) {
                    if (weekEntries.length > 0) {
                        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
                        let weekRunningBalance = runningBalance;
                        const augmentedEntries = weekEntries.map(e => {
                            weekRunningBalance += e.amount;
                            return {...e, localRunningBalance: weekRunningBalance };
                        });
                        
                        statements.push({
                            week: `${format(currentWeekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`,
                            openingBalance: runningBalance,
                            entries: augmentedEntries,
                            closingBalance: weekRunningBalance
                        });
                        runningBalance = weekRunningBalance;
                    }
                    
                    currentWeekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
                    weekEntries = [entry];
                } else {
                    weekEntries.push(entry);
                }
            }
            
            if (weekEntries.length > 0) {
                let weekRunningBalance = runningBalance;
                const augmentedEntries = weekEntries.map(e => {
                    weekRunningBalance += e.amount;
                    return {...e, localRunningBalance: weekRunningBalance };
                });
                
                statements.push({
                    week: `${format(currentWeekStart, 'dd MMM')} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}`,
                    openingBalance: runningBalance,
                    entries: augmentedEntries,
                    closingBalance: weekRunningBalance
                });
            }
        }
        
        return statements.reverse();
    }, [entries]);

    if (entries.length === 0) {
        return (
            <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                No transactions for this club.
            </div>
        );
    }
    
    const displaySymbol = currencySymbol || '₹';

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue={weeklyData.length > 0 ? weeklyData[0].week : undefined}>
            {weeklyData.map(week => (
                <AccordionItem value={week.week} key={week.week}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4 text-sm">
                            <span>{week.week}</span>
                            <span className="font-semibold">Closing: {displaySymbol}{week.closingBalance.toFixed(0)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="p-2 text-xs">Date</TableHead>
                                <TableHead className="p-2 text-xs">Type</TableHead>
                                <TableHead className="p-2 text-xs">Notes</TableHead>
                                <TableHead className="text-right p-2 text-xs">Amount</TableHead>
                                <TableHead className="text-right p-2 text-xs">Balance</TableHead>
                                <TableHead className="text-right p-2 text-xs">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="font-semibold bg-muted/50">
                                <TableCell colSpan={4} className="p-2 text-xs">Opening Balance</TableCell>
                                <TableCell className="text-right font-mono p-2 text-xs">{displaySymbol}{week.openingBalance.toFixed(0)}</TableCell>
                                <TableCell className="p-2"></TableCell>
                            </TableRow>
                            {week.entries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell className="p-2 text-xs">{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="capitalize p-2 text-xs">
                                        <span className={cn('inline-flex items-center gap-1.5', entry.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                                            {entry.amount >= 0 ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>}
                                            {entry.type === 'deposit' ? 'Deposit' : entry.type === 'withdrawal' ? 'Withdrawal' : (entry.amount >= 0 ? 'Profit' : 'Loss')}
                                        </span>
                                    </TableCell>
                                    <TableCell>{entry.notes}</TableCell>
                                    <TableCell className={cn('text-right font-mono p-2 text-xs', entry.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {entry.amount >= 0 ? '+' : '-'}{onlineClubCurrencyMap.get(entry.onlineClubName || '') || '₹'}{Math.abs(entry.amount).toFixed(0)}
                                    </TableCell>
                                     <TableCell className="text-right font-mono p-2 text-xs">
                                       {displaySymbol}{entry.localRunningBalance.toFixed(0)}
                                    </TableCell>
                                    <TableCell className="text-right p-2">
                                        {entry.type !== 'p/l' && (
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => onEditEntry(entry)} className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete this {entry.type} of {displaySymbol}{Math.abs(entry.amount).toFixed(0)}. This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onDeleteTransaction(accountId, entry.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold text-sm bg-muted hover:bg-muted">
                                <TableCell colSpan={4} className="p-2 text-xs">Closing Balance</TableCell>
                                <TableCell className="text-right font-mono p-2 text-xs">{displaySymbol}{week.closingBalance.toFixed(0)}</TableCell>
                                <TableCell className="p-2"></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
};


export default AdminOnlineClubPage;
