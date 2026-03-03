'use client';

import { useState, useEffect, useMemo, type FC, useCallback, useRef } from 'react';
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
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, OnlineClub } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Plus, Save, Edit, Trash2, Landmark, Banknote, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { getClub } from '@/services/club-service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const SUPER_ADMIN_WHATSAPP = '919843350000';

const OnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [account, setAccount] = useState<OnlinePlayerAccount | null>(null);
    const [ledger, setLedger] = useState<OnlineLedgerEntry[]>([]);
    const [onlineClubs, setOnlineClubs] = useState<OnlineClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<OnlineLedgerEntry | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

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
        onlineClubs.forEach(club => {
            if (club.name) {
                map.set(club.name, club.currency || '₹');
            }
        });
        return map;
    }, [onlineClubs]);

    useEffect(() => {
        const userStr = localStorage.getItem('chip-maestro-user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        } else {
            router.push('/login');
        }
    }, [router]);

    const refreshData = useCallback(async (isInitialLoad = false) => {
        if (!currentUser) return;
        if (isInitialLoad) {
            setIsLoading(true);
        }
        try {
            const activeClubId = localStorage.getItem('chip-maestro-clubId');
            if (!activeClubId) {
                if (isInitialLoad) {
                    toast({ variant: 'destructive', title: 'No active club', description: 'Please select a club from your dashboard.' });
                }
                setOnlineClubs([]);
                return;
            }

            // Fetch all data in parallel
            const [playerAccount, playerLedger, clubs] = await Promise.all([
                getOnlinePlayerAccount(currentUser.id),
                getOnlineLedgerEntries(currentUser.id),
                getOnlineClubs(activeClubId),
            ]);

            setAccount(playerAccount);
            setLedger(playerLedger);
            setOnlineClubs(clubs);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to load online account data.';
            if (isInitialLoad) {
                toast({ variant: 'destructive', title: 'Error', description: msg });
            }
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [currentUser, toast]);


    useEffect(() => {
        if (currentUser) {
            refreshData(true);
        }

        const handleFocus = () => refreshData(false);
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'chip-maestro-clubId') {
                refreshData(true);
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [currentUser, refreshData]);

    const balanceByClub = useMemo(() => {
        if (!ledger || !onlineClubs) return [];
    
        const balances: { [key: string]: { balance: number; currency: string; } } = {};
    
        onlineClubs.forEach(club => {
            if(club.name) {
                balances[club.name] = { balance: 0, currency: club.currency || '₹' };
            }
        });
    
        ledger.forEach(entry => {
            if (entry.onlineClubName) {
                if (balances[entry.onlineClubName] === undefined) {
                    // This can happen if a transaction exists for an online club that was deleted.
                    balances[entry.onlineClubName] = { balance: 0, currency: onlineClubCurrencyMap.get(entry.onlineClubName) || '₹' };
                }
                balances[entry.onlineClubName].balance += entry.amount;
            }
        });
    
        return Object.entries(balances).map(([name, data]) => ({ name, ...data })).sort((a,b) => a.name.localeCompare(b.name));
    }, [ledger, onlineClubs, onlineClubCurrencyMap]);
    
    const filteredLedger = useMemo(() => {
        if (activeTab === 'all') {
            return ledger;
        }
        return ledger.filter(entry => entry.onlineClubName === activeTab);
    }, [ledger, activeTab]);

    const currencyForTab = useMemo(() => {
        if (activeTab === 'all') {
            return onlineClubCurrencyMap.values().next().value || '₹'; // Default currency
        }
        return onlineClubCurrencyMap.get(activeTab) || '₹';
    }, [activeTab, onlineClubCurrencyMap]);


    const handlePlSubmit = async (amount: number, notes: string, date: string, onlineClubName: string) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await addProfitLoss(currentUser.id, amount, notes, date, onlineClubName);
            toast({ title: 'Success', description: 'Your P/L has been recorded.' });
            await refreshData(false);
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
            await refreshData(false);
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
            await refreshData(false);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not delete entry.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        }
    };

    const handleExportPdf = async () => {
        if (!account) {
            toast({
                variant: "destructive",
                title: "Export Error",
                description: "There is no account data to export.",
            });
            return;
        }

        setIsExporting(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Design tokens
            const textPrimary = '#0F172A';
            const textMuted = '#94A3B8';
            const profitColor = '#10B981';
            const lossColor = '#F43F5E';
            const badgeColors = ["#DBEAFE", "#D1FAE5", "#FEF3C7", "#FEE2E2", "#E0E7FF", "#DBEAFE", "#E0E7FF"];
            const badgeTextColors = ["#1E40AF", "#065F46", "#92400E", "#991B1B", "#3730A3", "#1E40AF", "#5B21B6"];
            
            // Group entries by club
            const entriesByClub = ledger.reduce((acc, entry) => {
                const clubName = entry.onlineClubName || 'Unassigned';
                if (!acc[clubName]) {
                    acc[clubName] = [];
                }
                acc[clubName].push(entry);
                return acc;
            }, {} as Record<string, OnlineLedgerEntry[]>);


            const drawHeader = () => {
                doc.setFontSize(36);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textPrimary);
                doc.text('SETTLEMENT LEDGER', 20, 30);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textMuted);
                doc.text('PLAYER', 20, 50);
                
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textPrimary);
                doc.text(account.playerName, 20, 58);
                
                // Balance Badges
                let currentX = pageWidth - 20;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                balanceByClub.slice().reverse().forEach((clubBalance, index) => {
                    const currency = clubBalance.name === 'Phoenix' ? 'Rs.' : clubBalance.currency;
                    const text = `${clubBalance.name}: ${currency}${clubBalance.balance.toFixed(0)}`;
                    const textWidth = doc.getTextWidth(text) + 12; // with padding
                    
                    if (currentX - textWidth < 20) { 
                        currentX = pageWidth - 20;
                    }
                    
                    doc.setFillColor(badgeColors[index % badgeColors.length]);
                    doc.setTextColor(badgeTextColors[index % badgeTextColors.length]);
                    doc.roundedRect(currentX - textWidth, 50, textWidth, 10, 3, 3, 'F');
                    doc.text(text, currentX - textWidth + 6, 56.5, {baseline: 'middle'});
                    currentX -= (textWidth + 5);
                });
            };

            const drawFooter = (page: number, totalPages: number) => {
                doc.setFontSize(8);
                doc.setTextColor(textMuted);
                doc.text(`Page ${page} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
                doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy, p')}`, 20, pageHeight - 10);
            };
            
            drawHeader();
            let lastY = 75;

            const sortedClubNames = Object.keys(entriesByClub).sort();

            for (const clubName of sortedClubNames) {
                const clubEntries = entriesByClub[clubName];
                const clubBalance = balanceByClub.find(b => b.name === clubName);

                // Calculate club-wise stats
                const clubProfit = clubEntries.filter(e => e.type === 'p/l' && e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
                const clubLoss = clubEntries.filter(e => e.type === 'p/l' && e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
                const clubDeposits = clubEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
                const clubWithdrawals = clubEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
                const currency = clubName === 'Phoenix' ? 'Rs.' : (clubBalance?.currency || '₹');


                if (lastY + 80 > pageHeight - 40) { // Check for page break
                    doc.addPage();
                    drawHeader();
                    lastY = 75;
                }

                // Add a header for the club section
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textPrimary);
                doc.text(`${clubName}`, 20, lastY);
                lastY += 15;

                // Draw summary cards for the club
                const cardStartY = lastY;
                const cardWidth = (pageWidth - 40 - 30) / 4;
                const drawClubCard = (x: number, label: string, value: string, color: string) => {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(textMuted);
                    doc.text(label, x, cardStartY);
                    doc.setFontSize(12);
                    doc.setFont('courier', 'bold');
                    doc.setTextColor(color);
                    doc.text(value, x, cardStartY + 8);
                };

                drawClubCard(20, 'PROFIT', `${currency} ${clubProfit.toFixed(0)}`, profitColor);
                drawClubCard(20 + cardWidth + 10, 'LOSS', `${currency} ${Math.abs(clubLoss).toFixed(0)}`, lossColor);
                drawClubCard(20 + 2 * (cardWidth + 10), 'DEPOSITS', `${currency} ${clubDeposits.toFixed(0)}`, textPrimary);
                drawClubCard(20 + 3 * (cardWidth + 10), 'WITHDRAWALS', `${currency} ${Math.abs(clubWithdrawals).toFixed(0)}`, textPrimary);
                
                lastY += 25;

                const tableColumn = ["Date", "Type", "Notes", "Amount"];
                const tableRows = clubEntries.map(entry => {
                    return [
                        format(parseISO(entry.date), 'dd/MM/yyyy p'),
                        entry.type.toUpperCase(),
                        entry.notes || '-',
                        `${entry.amount >= 0 ? '+' : '-'}${currency}${Math.abs(entry.amount).toFixed(0)}`,
                    ];
                });

                (doc as any).autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: lastY,
                    theme: 'plain',
                    headStyles: { textColor: textMuted, fontStyle: 'bold', fontSize: 9 },
                    styles: { font: 'helvetica', textColor: textPrimary, fontSize: 10 },
                    columnStyles: { 
                        3: { 
                            halign: 'right',
                            font: 'courier', // Using a monospaced font
                            fontStyle: 'bold'
                        } 
                    },
                    willDrawCell: (data: any) => {
                        doc.setTextColor(textPrimary);
                        if (data.column.index === 3 && data.section === 'body') {
                            const rawValue = clubEntries[data.row.index].amount;
                            doc.setTextColor(rawValue >= 0 ? profitColor : lossColor);
                        }
                    },
                });

                lastY = (doc as any).lastAutoTable.finalY + 15;
            }

            // Draw footer on all pages
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                drawFooter(i, pageCount);
            }

            const filename = `online-ledger-${account.playerName.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            doc.save(filename);

            toast({ title: 'PDF Exported', description: 'Your ledger has been downloaded.' });

        } catch (error) {
            console.error("Could not export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "An error occurred while generating the PDF." });
        } finally {
            setIsExporting(false);
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
            <SubmitPlCard 
                isSubmitting={isSubmitting} 
                onSubmit={handlePlSubmit} 
                onlineClubs={onlineClubs} 
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Recent Transactions</CardTitle>
                             <CardDescription>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {balanceByClub.map((clubBalance, index) => (
                                        <Badge key={clubBalance.name} className={cn('font-semibold', badgeColors[index % badgeColors.length])}>
                                            {clubBalance.name}: {clubBalance.currency}{clubBalance.balance.toFixed(0)}
                                        </Badge>
                                    ))}
                                    {balanceByClub.length === 0 && <p className="text-sm text-muted-foreground">No balances to display.</p>}
                                </div>
                            </CardDescription>
                        </div>
                        <Button onClick={handleExportPdf} disabled={isExporting || ledger.length === 0}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Export PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            {onlineClubs.map(club => (
                                <TabsTrigger key={club.id} value={club.name}>{club.name}</TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value={activeTab} className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Online Club</TableHead>
                                        <TableHead>Payment Mode / Notes</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
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
                                                {entry.amount >= 0 ? `+` : `-`}{(entry.onlineClubName && onlineClubCurrencyMap.get(entry.onlineClubName)) || '₹'}{Math.abs(entry.amount).toFixed(0)}
                                            </TableCell>
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
                                                                <AlertDialogDescription>This will permanently delete this P/L entry of {currencyForTab}{Math.abs(entry.amount).toFixed(0)}. This action cannot be undone.</AlertDialogDescription>
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
                                    {filteredLedger.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">No transactions for this view.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
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
        </div>
    );
};

const SubmitPlCard: FC<{ isSubmitting: boolean; onSubmit: (amount: number, notes: string, date: string, onlineClubName: string) => void; onlineClubs: OnlineClub[] }> = ({ isSubmitting, onSubmit, onlineClubs }) => {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [onlineClubName, setOnlineClubName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || !onlineClubName) {
            alert('Please enter a valid amount and select an online club.');
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
                        <Select value={onlineClubName} onValueChange={setOnlineClubName}>
                            <SelectTrigger>
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
                        <Label htmlFor="pl-notes">Notes (Optional)</Label>
                        <Textarea id="pl-notes" placeholder="e.g. PokerBaazi session, 2 tables" value={notes} onChange={e => setNotes(e.target.value)} />
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
        if (isNaN(numAmount) || !onlineClubName) {
            alert('Please enter a valid amount and select an online club.');
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
                        <Select value={onlineClubName} onValueChange={setOnlineClubName}>
                            <SelectTrigger>
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
                        <Label htmlFor="edit-pl-notes">Notes (Optional)</Label>
                        <Textarea id="edit-pl-notes" value={notes} onChange={e => setNotes(e.target.value)} />
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
