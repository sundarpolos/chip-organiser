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

    const accountCurrency = useMemo(() => {
        if (onlineClubs && onlineClubs.length > 0) {
            const clubWithCurrency = onlineClubs.find(c => c.currency);
            return clubWithCurrency?.currency || '₹';
        }
        return '₹';
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
    
    const filteredLedger = useMemo(() => {
        if (activeTab === 'all') {
            return ledger;
        }
        return ledger.filter(entry => entry.onlineClubName === activeTab);
    }, [ledger, activeTab]);

    const totals = useMemo(() => {
        return filteredLedger.reduce(
            (acc, entry) => {
                if (entry.type === 'p/l') {
                    acc.pl += entry.amount;
                } else if (entry.type === 'deposit') {
                    acc.deposits += entry.amount;
                } else if (entry.type === 'withdrawal') {
                    acc.withdrawals += entry.amount;
                }
                return acc;
            },
            { pl: 0, deposits: 0, withdrawals: 0 }
        );
    }, [filteredLedger]);

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

            // Colors from template
            const headerBg = '#1C2836';
            const footerBg = '#1C2836';
            const headerText = '#FFFFFF';
            const bodyText = '#333333';
            const mutedText = '#888888';
            const positiveColor = '#22c55e'; // green-500 from Tailwind
            const negativeColor = '#ef4444'; // red-500 from Tailwind
            const borderColor = '#e0e0e0';

            const tableColumn = ["Date", "Type", "Online Club", "Amount", "Balance"];
            const tableRows = ledger.map(entry => [
                format(parseISO(entry.date), 'dd/MM/yyyy p'),
                entry.type.toUpperCase(),
                entry.onlineClubName || '-',
                `${accountCurrency}${entry.amount.toFixed(0)}`,
                `${accountCurrency}${entry.runningBalance.toFixed(0)}`,
            ]);

            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                theme: 'plain',
                startY: 85,
                headStyles: {
                    textColor: mutedText,
                    fontStyle: 'bold',
                    fontSize: 10,
                },
                styles: {
                    textColor: bodyText,
                    font: 'helvetica',
                },
                columnStyles: {
                    3: { halign: 'right' },
                    4: { halign: 'right' }
                },
                willDrawCell: (data: any) => {
                    doc.setTextColor(bodyText); // Reset text color
                    if (data.column.index === 3 && data.section === 'body') {
                        const rawValue = ledger[data.row.index].amount;
                        doc.setTextColor(rawValue >= 0 ? positiveColor : negativeColor);
                    }
                },
                didDrawCell: (data: any) => {
                    if (data.row.section === 'body' || data.row.section === 'head') {
                        doc.setDrawColor(borderColor);
                        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                    }
                },
                didDrawPage: (data: any) => {
                    // Header
                    doc.setFillColor(headerBg);
                    doc.rect(0, 0, pageWidth, 25, 'F');
                    doc.setTextColor(headerText);
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('PLAYER LEDGER REPORT', pageWidth / 2, 15, { align: 'center' });
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text('VERIFIED SETTLEMENT LEDGER', pageWidth / 2, 20, { align: 'center' });

                    // Summary Info
                    doc.setFontSize(10);
                    doc.setTextColor(mutedText);
                    doc.text('PLAYER', 20, 40);
                    doc.setFontSize(16);
                    doc.setTextColor(bodyText);
                    doc.setFont('helvetica', 'bold');
                    doc.text(account.playerName, 20, 48);

                    const balanceText = `${accountCurrency}${account.balance.toFixed(0)}`;
                    const balanceColor = account.balance >= 0 ? positiveColor : negativeColor;
                    doc.setFontSize(10);
                    doc.setTextColor(mutedText);
                    doc.text('CURRENT BALANCE', pageWidth - 20, 40, { align: 'right' });
                    doc.setFontSize(22);
                    doc.setTextColor(balanceColor);
                    doc.setFont('helvetica', 'bold');
                    doc.text(balanceText, pageWidth - 20, 52, { align: 'right' });

                    // Footer
                    doc.setFillColor(footerBg);
                    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(headerText);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Certified settlement record for ${account.playerName}.`, 20, pageHeight - 8);
                    doc.text(`EXPORTED: ${format(new Date(), 'dd/MM/yyyy p')}`, pageWidth - 20, pageHeight - 8, { align: 'right'});
                },
            });

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
                        Balance: <span className={account?.balance ?? 0 >= 0 ? 'text-green-600' : 'text-red-600'}>{accountCurrency}{account?.balance.toFixed(0) ?? '0'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Last updated: {account ? format(parseISO(account.lastUpdated), 'PPP p') : 'N/A'}</p>
                </CardContent>
            </Card>

            <SubmitPlCard 
                isSubmitting={isSubmitting} 
                onSubmit={handlePlSubmit} 
                onlineClubs={onlineClubs} 
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Recent Transactions</CardTitle>
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
                                                {entry.amount >= 0 ? '+' : ''}{accountCurrency}{entry.amount.toFixed(0)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{accountCurrency}{entry.runningBalance.toFixed(0)}</TableCell>
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
                                                                <AlertDialogDescription>This will permanently delete this P/L entry of {accountCurrency}{entry.amount.toFixed(0)}. This action cannot be undone.</AlertDialogDescription>
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
                                            <TableCell colSpan={7} className="text-center h-24">No transactions for this view.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                {filteredLedger.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className="font-semibold">Profit/Loss</TableCell>
                                            <TableCell className={`text-right font-mono font-semibold ${totals.pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {accountCurrency}{totals.pl.toFixed(0)}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} className="font-semibold">Deposits</TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-green-600">
                                                {accountCurrency}{totals.deposits.toFixed(0)}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} className="font-semibold">Withdrawals</TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-red-600">
                                                {accountCurrency}{Math.abs(totals.withdrawals).toFixed(0)}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                        <TableRow className="font-bold text-lg bg-muted">
                                            <TableCell colSpan={4}>Final Balance</TableCell>
                                            <TableCell colSpan={3} className={`text-right font-mono ${account?.balance ?? 0 >= 0 ? '' : 'text-red-500'}`}>
                                                {accountCurrency}{account?.balance.toFixed(0) ?? '0'}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                )}
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
