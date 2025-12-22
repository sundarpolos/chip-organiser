
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getGameHistory, saveGameHistory } from '@/services/game-service';
import { getClubs } from '@/services/club-service';
import { getMasterPlayers } from '@/services/player-service';
import { sendWhatsappMessage } from '@/ai/flows/send-whatsapp-message';
import type { GameHistory, GameExpense, Club, MasterPlayer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2, Banknote, MessageSquare, Send, Copy, Check, FileDown } from 'lucide-react';
import { format, startOfDay, parse } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

const DailyExpensesPage = () => {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  
  const dateString = params.date as string;
  const selectedDate = useMemo(() => parse(dateString, 'yyyy-MM-dd', new Date()), [dateString]);

  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string>('');
  const [allPlayers, setAllPlayers] = useState<MasterPlayer[]>([]);
  const [allGames, setAllGames] = useState<GameHistory[]>([]);
  
  const [paidPlayerIds, setPaidPlayerIds] = useState<string[]>([]);
  const [collectionAmount, setCollectionAmount] = useState(2500);
  const [expenses, setExpenses] = useState<GameExpense[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendMessageModalOpen, setSendMessageModalOpen] = useState(false);

  const isSuperAdmin = useMemo(() => currentUser?.whatsappNumber === '919843350000', [currentUser]);

  // Initial data loading
  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    const clubId = localStorage.getItem('chip-maestro-clubId');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.isAdmin) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/dashboard');
        return;
      }
      setActiveClubId(clubId || '');
    } else {
      router.push('/login');
    }
  }, [router, toast]);
  
  useEffect(() => {
    async function loadData() {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [clubs, players, games] = await Promise.all([getClubs(), getMasterPlayers(), getGameHistory()]);
            setAllClubs(clubs);
            setAllPlayers(players);
            setAllGames(games);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load initial data.' });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [currentUser, toast]);

  // When date or club changes, load the relevant data
  useEffect(() => {
    if (isNaN(selectedDate.getTime())) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'The provided date is not valid.' });
        router.push('/expenses');
        return;
    }
    
    const selectedDayStart = startOfDay(selectedDate).getTime();
    
    // Find a game on the selected date for the active club to load its data
    const gameForDate = allGames.find(g => 
        g.clubId === activeClubId && 
        g.venue === 'Daily Accounting' &&
        startOfDay(new Date(g.timestamp)).getTime() === selectedDayStart
    );

    if (gameForDate) {
        setCollectionAmount(gameForDate.playerEntryFee || 2500);
        setPaidPlayerIds(gameForDate.paidPlayerIds || gameForDate.players.map(p => p.id));
        setExpenses(gameForDate.expenses || []);
    } else {
        // Reset if no game found for that day
        setCollectionAmount(2500);
        setPaidPlayerIds([]);
        setExpenses([]);
    }

    // Calculate Opening Balance from previous day's Cash in Hand
    const yesterday = new Date(selectedDayStart - 86400000); // 24 * 60 * 60 * 1000
    const yesterdayStart = startOfDay(yesterday).getTime();
    
    const gamesFromYesterday = allGames
        .filter(g => g.clubId === activeClubId && g.venue === 'Daily Accounting' && startOfDay(new Date(g.timestamp)).getTime() === yesterdayStart)
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (gamesFromYesterday.length > 0) {
        const lastGameYesterday = gamesFromYesterday[0];
        const paidCount = lastGameYesterday.paidPlayerIds?.length ?? lastGameYesterday.players.length;
        const income = paidCount * (lastGameYesterday.playerEntryFee || 0);
        const totalExpenses = (lastGameYesterday.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        setOpeningBalance(income - totalExpenses);
    } else {
        setOpeningBalance(0);
    }

  }, [selectedDate, activeClubId, allGames, toast, router]);

  const activeClubPlayers = useMemo(() => {
    return allPlayers.filter(p => p.clubId === activeClubId && p.isActive).sort((a,b) => a.name.localeCompare(b.name));
  }, [allPlayers, activeClubId]);

  const accountingSummary = useMemo(() => {
    const totalEntryFees = paidPlayerIds.length * collectionAmount;
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalEntryFees - totalExpenses;
    const cashInHand = openingBalance + netProfit;
    return { totalEntryFees, totalExpenses, netProfit, cashInHand };
  }, [paidPlayerIds, collectionAmount, expenses, openingBalance]);

  const handleExpenseChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newExpenses = [...expenses];
    const expenseToUpdate = { ...newExpenses[index] };
    if (field === 'amount') {
      expenseToUpdate[field] = Number(value);
    } else {
      expenseToUpdate[field] = value as string;
    }
    newExpenses[index] = expenseToUpdate;
    setExpenses(newExpenses);
  };

  const addExpense = () => setExpenses(prev => [...prev, { name: '', amount: 0 }]);
  const removeExpense = (index: number) => setExpenses(prev => prev.filter((_, i) => i !== index));

  const handlePlayerPayToggle = (playerId: string, isPaid: boolean) => {
    setPaidPlayerIds(prev => isPaid ? [...prev, playerId] : prev.filter(id => id !== playerId));
  };
  
  const handleSelectAllPlayers = (isChecked: boolean) => {
    setPaidPlayerIds(isChecked ? activeClubPlayers.map(p => p.id) : []);
  };
  
  const handleSave = async () => {
    if (!activeClubId) return;
    setIsSaving(true);
    try {
        const selectedDayStart = startOfDay(selectedDate).getTime();
        let gameForDate = allGames.find(g => 
            g.clubId === activeClubId && 
            g.venue === 'Daily Accounting' &&
            startOfDay(new Date(g.timestamp)).getTime() === selectedDayStart
        );
        
        const playersForSave = activeClubPlayers.filter(p => paidPlayerIds.includes(p.id)).map(p => ({
          id: p.id,
          name: p.name,
          whatsappNumber: p.whatsappNumber,
          buyIns: [],
          finalChips: 0,
          clubId: activeClubId
        }));

        if (gameForDate) {
            // Update existing record
            const gameToSave = { 
                ...gameForDate, 
                playerEntryFee: collectionAmount,
                paidPlayerIds: paidPlayerIds,
                expenses: expenses,
                players: playersForSave,
                timestamp: selectedDate.toISOString(), // Ensure timestamp is updated
            };
            await saveGameHistory(gameToSave);
        } else {
            // Create a new dummy game history for accounting purposes
            const newAccountingRecord: Omit<GameHistory, 'id'> = {
                venue: 'Daily Accounting',
                timestamp: selectedDate.toISOString(),
                players: playersForSave,
                clubId: activeClubId,
                playerEntryFee: collectionAmount,
                paidPlayerIds: paidPlayerIds,
                expenses: expenses,
            };
            const savedGame = await saveGameHistory(newAccountingRecord);
            setAllGames(prev => [...prev, savedGame]);
        }
        
      toast({ title: 'Data Saved', description: 'The financial data for this day has been updated.' });
      router.push('/expenses');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save data.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleExportPdf = async () => {
        if (!activeClubId) {
            toast({ variant: "destructive", title: "Export Error", description: "No club selected." });
            return;
        }
        
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Title
            const clubName = allClubs.find(c => c.id === activeClubId)?.name || '';
            doc.setFontSize(20);
            doc.text("Daily Expenses & Accounting", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(12);
            doc.text(`${clubName} - ${format(selectedDate, 'PPP')}`, pageWidth / 2, 22, { align: "center" });

            // Summary Table
            (doc as any).autoTable({
                startY: 30,
                head: [['Description', 'Amount']],
                body: [
                    ['Opening Balance', `₹${openingBalance.toFixed(2)}`],
                    ['Total Entry Fees Collected', `+ ₹${accountingSummary.totalEntryFees.toFixed(2)}`],
                    ['Total Expenses', `- ₹${accountingSummary.totalExpenses.toFixed(2)}`],
                    ['Day\'s Profit / Loss', `₹${accountingSummary.netProfit.toFixed(2)}`],
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                foot: [
                    [{ content: 'Cash in Hand', colSpan: 1, styles: { fontStyle: 'bold', fontSize: 12 } }, { content: `₹${accountingSummary.cashInHand.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fontSize: 12 }}]
                ],
                didParseCell: function(data: any) {
                    if (data.row.section === 'body' && data.column.index === 1) {
                        const text = data.cell.text[0];
                        if(text.startsWith('+')) data.cell.styles.textColor = [0, 128, 0]; // Green
                        if(text.startsWith('-')) data.cell.styles.textColor = [255, 0, 0]; // Red
                    }
                    if (data.row.section === 'foot') {
                         data.cell.styles.fillColor = [230, 230, 230];
                         data.cell.styles.textColor = [0,0,0];
                    }
                }
            });

            const summaryTableEnd = (doc as any).lastAutoTable.finalY;

            // Expenses Table
            if (expenses && expenses.length > 0) {
                 (doc as any).autoTable({
                    startY: summaryTableEnd + 10,
                    head: [['Expense Name', 'Amount']],
                    body: expenses.map(exp => [exp.name, `₹${exp.amount.toFixed(2)}`]),
                    theme: 'striped',
                    headStyles: { fillColor: [22, 160, 133] },
                 });
            }

            // Players Table
            if (activeClubPlayers && activeClubPlayers.length > 0) {
                 (doc as any).autoTable({
                    startY: (doc as any).lastAutoTable.finalY + 10,
                    head: [['Player Name', 'Entry Fee Paid']],
                    body: activeClubPlayers.map(player => [
                        player.name,
                        paidPlayerIds.includes(player.id) ? 'Yes' : 'No'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [142, 68, 173] },
                });
            }
            
            const filename = `daily-expenses-${format(selectedDate, 'yyyy-MM-dd')}.pdf`;
            doc.save(filename);
            toast({ title: 'Report Exported', description: 'Your report has been downloaded as a PDF.' });

        } catch (error) {
            console.error("Failed to export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "Could not generate the PDF report." });
        } finally {
            setIsExporting(false);
        }
    };
    
  if (isLoading || isNaN(selectedDate.getTime())) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className='flex items-center justify-between'>
        <Button asChild variant="outline">
          <Link href="/expenses">
            <Banknote className="mr-2 h-4 w-4" />
            Back to Log
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote /> Daily Expenses & Accounting</CardTitle>
          <CardDescription>Manage daily income, expenses, and profit/loss for your club on {format(selectedDate, 'PPP')}.</CardDescription>
        </CardHeader>
        <CardContent>
            {isSuperAdmin && (
                <div className="mb-4 max-w-sm">
                    <Select value={activeClubId} onValueChange={setActiveClubId}>
                        <SelectTrigger>
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

            {activeClubId && (
                <>
                <Separator className="my-6" />
                 <div className="space-y-6 bg-background p-0 md:p-4 rounded-lg">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                             </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{openingBalance.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">From previous day</p>
                            </CardContent>
                        </Card>
                         <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                             </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+ ₹{accountingSummary.totalEntryFees.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">{paidPlayerIds.length} players</p>
                            </CardContent>
                        </Card>
                         <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                             </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">- ₹{accountingSummary.totalExpenses.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">{expenses.length} items</p>
                            </CardContent>
                        </Card>
                         <Card className="bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800">
                           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
                             </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", accountingSummary.cashInHand >= 0 ? "text-green-600" : "text-red-600")}>
                                    ₹{accountingSummary.cashInHand.toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground">Day End Balance</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Column: Collections */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Collections</h3>
                            <Card>
                                <CardHeader className='p-4'>
                                    <div className="space-y-2">
                                        <Label htmlFor='collection-amount'>Collection Amount per Player</Label>
                                        <Input id="collection-amount" type="number" value={collectionAmount} onChange={e => setCollectionAmount(Number(e.target.value))} />
                                    </div>
                                    <Separator className='my-4'/>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="select-all-players" checked={activeClubPlayers.length > 0 && paidPlayerIds.length === activeClubPlayers.length} onCheckedChange={handleSelectAllPlayers}/>
                                        <Label htmlFor="select-all-players" className="text-base font-semibold">Mark All as Paid</Label>
                                    </div>
                                </CardHeader>
                                <CardContent className='p-4 pt-0'>
                                    <ScrollArea className="h-48 border rounded-md p-2">
                                    {activeClubPlayers.length > 0 ? activeClubPlayers.map(player => (
                                        <div key={player.id} className="flex items-center space-x-3 p-1">
                                            <Checkbox id={`player-${player.id}`} checked={paidPlayerIds.includes(player.id)} onCheckedChange={checked => handlePlayerPayToggle(player.id, !!checked)}/>
                                            <Label htmlFor={`player-${player.id}`} className="flex-1 cursor-pointer">{player.name}</Label>
                                        </div>
                                    )) : <p className="text-center text-sm text-muted-foreground p-4">No active players in this club.</p>}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                        {/* Right Column: Expenses */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Expenses</h3>
                            <Card>
                                <CardContent className='p-4'>
                                    <div className="space-y-2">
                                        {expenses.map((exp, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <Input placeholder="Expense Name (e.g., Rent)" value={exp.name} onChange={(e) => handleExpenseChange(index, 'name', e.target.value)}/>
                                                <Input type="number" placeholder="Amount" value={exp.amount === 0 ? '' : exp.amount} onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)} className="w-32"/>
                                                <Button variant="ghost" size="icon" onClick={() => removeExpense(index)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                     <Button variant="outline" size="sm" onClick={addExpense} className="mt-4"><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                 </div>
                </>
            )}
        </CardContent>
         <CardFooter className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setSendMessageModalOpen(true)} disabled={!activeClubId}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send to Group
            </Button>
             <Button onClick={handleExportPdf} size="sm" disabled={!activeClubId || isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
                Export PDF
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving || !activeClubId}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Expenses
            </Button>
        </CardFooter>
      </Card>
      
      {activeClubId && (
        <SendExpenseSummaryDialog
            isOpen={isSendMessageModalOpen}
            onOpenChange={setSendMessageModalOpen}
            club={allClubs.find(c => c.id === activeClubId)}
            date={selectedDate}
            summary={accountingSummary}
            openingBalance={openingBalance}
            expenses={expenses}
            toast={toast}
        />
      )}
    </div>
  );
};

const SendExpenseSummaryDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    club: Club | undefined;
    date: Date;
    summary: { totalEntryFees: number; totalExpenses: number; netProfit: number; cashInHand: number };
    openingBalance: number;
    expenses: GameExpense[];
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, club, date, summary, openingBalance, expenses, toast }) => {
    const [isSending, setIsSending] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const message = useMemo(() => {
        if (!club) return '';
        let msg = `*Financial Summary for ${club.name} on ${format(date, 'PPP')}*\n\n`;
        msg += `*Opening Balance:* ₹${openingBalance.toFixed(2)}\n`;
        msg += `*Collections:* + ₹${summary.totalEntryFees.toFixed(2)}\n`;
        msg += `*Day's Total Expenses:* - ₹${summary.totalExpenses.toFixed(2)}\n`;
        if (expenses.length > 0) {
            expenses.forEach(exp => {
                if(exp.name && exp.amount > 0) msg += `  - ${exp.name}: ₹${exp.amount.toFixed(2)}\n`;
            });
        }
        msg += `----------------------------------\n`;
        msg += `*Day's P/L:* ₹${summary.netProfit.toFixed(2)}\n`;
        msg += `*Cash in Hand:* ₹${summary.cashInHand.toFixed(2)}\n`;
        
        return msg;
    }, [club, date, summary, openingBalance, expenses]);

    const handleSend = async () => {
        const groupId = club?.whatsappConfig?.whatsappGroupId;
        if (!groupId) {
            toast({ variant: 'destructive', title: 'Group ID not set', description: 'Please configure the WhatsApp Group ID in the club settings.'});
            return;
        }

        setIsSending(true);
        try {
            const result = await sendWhatsappMessage({
                to: groupId,
                message: message,
                isGroup: true,
                ...(club.whatsappConfig || {})
            });
            if (result.success) {
                toast({ title: 'Summary Sent!', description: 'The financial summary has been sent to the group.' });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            const error = e as Error;
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(message).then(() => {
            setIsCopied(true);
            toast({ title: 'Copied!', description: 'Summary copied to clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Financial Summary</DialogTitle>
                    <DialogDescription>
                        A summary of the day's finances will be sent to the configured WhatsApp group.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label>Message Preview</Label>
                    <Textarea value={message} readOnly className="h-64 mt-2 font-mono text-xs"/>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">Copy to Clipboard</span>
                    </Button>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSend} disabled={isSending}>
                            {isSending ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Send to Group</>}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


export default DailyExpensesPage;
