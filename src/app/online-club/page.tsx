

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
import type { MasterPlayer, OnlinePlayerAccount, OnlineLedgerEntry, OnlineClub, Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Plus, Save, Edit, Trash2, Landmark, Banknote, FileDown, ArrowUp, ArrowDown, Minus, MessageSquare, Send } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendWhatsappMessage } from '@/ai/flows/send-whatsapp-message';


const SUPER_ADMIN_WHATSAPP = '919843350000';

const WeeklyLedgerAccordion: FC<{
    entries: OnlineLedgerEntry[],
    onlineClubCurrencyMap: Map<string, string>,
    onEditEntry: (entry: OnlineLedgerEntry) => void,
    onDeleteEntry: (entryId: string) => void,
    currencySymbol?: string,
}> = ({ entries, onlineClubCurrencyMap, onEditEntry, onDeleteEntry, currencySymbol }) => {

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
                        <div className="flex justify-between w-full pr-4">
                            <span>{week.week}</span>
                            <span className="font-semibold">Closing: {displaySymbol}{week.closingBalance.toFixed(0)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
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
                            <TableRow className="font-semibold bg-muted/50">
                                <TableCell colSpan={5}>Opening Balance</TableCell>
                                <TableCell className="text-right font-mono">{displaySymbol}{week.openingBalance.toFixed(0)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {week.entries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="capitalize">{entry.type}</TableCell>
                                    <TableCell>{entry.onlineClubName || '-'}</TableCell>
                                    <TableCell>{entry.notes}</TableCell>
                                    <TableCell className={cn('text-right font-mono', entry.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {entry.amount >= 0 ? <ArrowUp className="inline h-3 w-3 mr-1"/> : <ArrowDown className="inline h-3 w-3 mr-1"/>}
                                        {onlineClubCurrencyMap.get(entry.onlineClubName || '') || '₹'}{Math.abs(entry.amount).toFixed(0)}
                                    </TableCell>
                                     <TableCell className="text-right font-mono">
                                       {displaySymbol}{entry.localRunningBalance.toFixed(0)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {entry.type === 'p/l' && (
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => onEditEntry(entry)}><Edit className="h-4 w-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete this P/L entry. This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onDeleteEntry(entry.id)}>Delete</AlertDialogAction>
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
                            <TableRow className="font-bold text-base bg-muted hover:bg-muted">
                                <TableCell colSpan={5}>Closing Balance</TableCell>
                                <TableCell className="text-right font-mono">{displaySymbol}{week.closingBalance.toFixed(0)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}

const SendOnlineClubReportDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onlineClub: OnlineClub | undefined;
    club: Club | null; // The main club for WA credentials
    weeklyData: {
        week: string;
        openingBalance: number;
        entries: (OnlineLedgerEntry & { localRunningBalance: number })[];
        closingBalance: number;
    }[];
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, onlineClub, club, weeklyData, toast }) => {
    const [isSending, setIsSending] = useState(false);

    const message = useMemo(() => {
        if (!onlineClub || !weeklyData || weeklyData.length === 0) return 'No data to send.';
        
        let msg = `*Online Ledger Report for ${onlineClub.name}*\n`;
        msg += `_Club: ${club?.name}_\n\n`;

        [...weeklyData].reverse().forEach(week => { // chronological order for message
            const currencySymbol = onlineClub.currency || '₹';
            msg += `*${week.week}*\n`;
            msg += `Opening: ${currencySymbol}${week.openingBalance.toFixed(0)}\n`;
            week.entries.forEach(entry => {
                 const sign = entry.amount >= 0 ? '+' : '-';
                 msg += `  ${format(parseISO(entry.date), 'dd/MM')}: ${entry.notes || entry.type} (${sign}${currencySymbol}${Math.abs(entry.amount).toFixed(0)}) -> Bal: ${currencySymbol}${entry.localRunningBalance.toFixed(0)}\n`;
            });
            msg += `*Closing: ${currencySymbol}${week.closingBalance.toFixed(0)}*\n\n`;
        });
        
        return msg.trim();
    }, [onlineClub, club, weeklyData]);

    const handleSend = async () => {
        if (!onlineClub?.whatsappGroupId) {
            toast({ variant: 'destructive', title: 'Group ID Missing', description: `No WhatsApp Group ID configured for ${onlineClub.name}.`});
            return;
        }

        setIsSending(true);
        try {
            const result = await sendWhatsappMessage({
                to: onlineClub.whatsappGroupId,
                message: message,
                isGroup: true,
                apiUrl: club?.whatsappConfig?.apiUrl,
                apiToken: club?.whatsappConfig?.apiToken,
                senderMobile: club?.whatsappConfig?.senderMobile,
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
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Send Report to Group</DialogTitle>
                    <DialogDescription>A summary for "{onlineClub?.name}" will be sent to its configured WhatsApp group.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label>Message Preview</Label>
                    <ScrollArea className="h-64 border rounded-md p-4 bg-muted">
                        <pre className="text-sm whitespace-pre-wrap">{message}</pre>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSend} disabled={isSending || !onlineClub?.whatsappGroupId}>
                        {isSending ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Send Report</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const OnlineClubPage: FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
    const [account, setAccount] = useState<OnlinePlayerAccount | null>(null);
    const [ledger, setLedger] = useState<OnlineLedgerEntry[]>([]);
    const [onlineClubs, setOnlineClubs] = useState<OnlineClub[]>([]);
    const [club, setClub] = useState<Club | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<OnlineLedgerEntry | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [isReportModalOpen, setReportModalOpen] = useState(false);

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
                setClub(null);
                return;
            }

            const [playerAccount, playerLedger, clubs, mainClub] = await Promise.all([
                getOnlinePlayerAccount(currentUser.id),
                getOnlineLedgerEntries(currentUser.id),
                getOnlineClubs(activeClubId),
                getClub(activeClubId),
            ]);

            setAccount(playerAccount);
            setLedger(playerLedger);
            setOnlineClubs(clubs);
            setClub(mainClub);
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
                    balances[entry.onlineClubName] = { balance: 0, currency: onlineClubCurrencyMap.get(entry.onlineClubName) || '₹' };
                }
                balances[entry.onlineClubName].balance += entry.amount;
            }
        });
    
        return Object.entries(balances).map(([name, data]) => ({ name, ...data })).sort((a,b) => a.name.localeCompare(b.name));
    }, [ledger, onlineClubs, onlineClubCurrencyMap]);

    const weeklyData = useMemo(() => {
        const entriesForTab = activeTab === 'all' ? ledger : ledger.filter(e => e.onlineClubName === activeTab);
        if (entriesForTab.length === 0) return [];
    
        const sortedLedger = [...entriesForTab].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
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
    }, [ledger, activeTab]);

    const activeOnlineClub = useMemo(() => {
        return onlineClubs.find(oc => oc.name === activeTab);
    }, [onlineClubs, activeTab]);

    const currencyForLedger = useMemo(() => {
        if (activeTab === 'all') return undefined; // Return undefined for 'All' tab
        const club = onlineClubs.find(oc => oc.name === activeTab);
        return club?.currency || '₹'; // Default to '₹' if currency is not set for the club
    }, [activeTab, onlineClubs]);


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
    
    const handleEditEntry = (entry: OnlineLedgerEntry) => {
        setEntryToEdit(entry);
        setEditModalOpen(true);
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
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 60;

            const FONT_PRIMARY = '#0a0a0a';
            const FONT_MUTED = '#737373';
            const POSITIVE_COLOR = '#16a34a';
            const NEGATIVE_COLOR = '#dc2626';

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

            // --- CLUB SECTIONS ---
            const clubsWithTransactions = Array.from(new Set(ledger.map(entry => entry.onlineClubName).filter(Boolean)));
            
            for (const clubName of clubsWithTransactions) {
                if (yPos > doc.internal.pageSize.getHeight() - 250) {
                    doc.addPage();
                    yPos = 60;
                }

                const clubEntries = ledger.filter(entry => entry.onlineClubName === clubName);
                const currencySymbol = onlineClubCurrencyMap.get(clubName) || '₹';

                const profit = clubEntries.filter(e => e.type === 'p/l' && e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
                const loss = clubEntries.filter(e => e.type === 'p/l' && e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
                const deposits = clubEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
                const withdrawals = clubEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(FONT_PRIMARY);
                doc.text(clubName, 40, yPos);
                yPos += 30;

                // --- STATS SUMMARY ---
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
                (doc as any).autoTable({
                    startY: yPos,
                    head: [['Date', 'Type', 'Notes', 'Amount']],
                    body: clubEntries.map(entry => [
                        format(parseISO(entry.date), 'dd/MM/yyyy p'),
                        entry.type.toUpperCase(),
                        entry.notes,
                        `${entry.amount >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(entry.amount).toFixed(0)}`
                    ]),
                    theme: 'plain',
                    styles: { font: 'helvetica', fontSize: 10, cellPadding: { top: 6, bottom: 6 } },
                    headStyles: { textColor: FONT_MUTED, fontStyle: 'normal' },
                    columnStyles: { 3: { halign: 'right' } },
                    didParseCell: (data: any) => {
                        if (data.column.index === 3 && data.cell.section === 'body') {
                           const value = clubEntries[data.row.index].amount;
                           data.cell.styles.textColor = value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
                        }
                    },
                    didDrawPage: (data: any) => {
                        yPos = data.cursor.y;
                    }
                });
                yPos = (doc as any).lastAutoTable.finalY + 20;
            }
            
            addPageFooter();

            const filename = `settlement-ledger-${account.playerName.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            doc.save(filename);
            toast({ title: 'PDF Exported', description: 'Your settlement ledger has been downloaded.' });

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
                                            {clubBalance.name}: {onlineClubCurrencyMap.get(clubBalance.name) || '₹'}{clubBalance.balance.toFixed(0)}
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
                            <div className="flex justify-end mb-4">
                                {activeTab !== 'all' && (
                                    <Button
                                        onClick={() => setReportModalOpen(true)}
                                        disabled={!activeOnlineClub?.whatsappGroupId}
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Send to Group
                                    </Button>
                                )}
                            </div>
                            <WeeklyLedgerAccordion 
                                entries={activeTab === 'all' ? ledger : ledger.filter(e => e.onlineClubName === activeTab)}
                                onlineClubCurrencyMap={onlineClubCurrencyMap}
                                onEditEntry={handleEditEntry}
                                onDeleteEntry={handleDeleteEntry}
                                currencySymbol={currencyForLedger}
                            />
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
            <SendOnlineClubReportDialog
                isOpen={isReportModalOpen}
                onOpenChange={setReportModalOpen}
                onlineClub={activeOnlineClub}
                club={club}
                weeklyData={weeklyData}
                toast={toast}
            />
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
