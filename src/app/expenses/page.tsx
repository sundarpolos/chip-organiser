
'use client';

import { useState, useEffect, useMemo, type FC, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getGameHistory, saveGameHistory } from '@/services/game-service';
import { getClubs, getClub } from '@/services/club-service';
import { sendWhatsappMessage } from '@/ai/flows/send-whatsapp-message';
import type { GameHistory, GameExpense, Club, MasterPlayer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Save, Trash2, Banknote, MessageSquare, Send, Copy, Check, FileDown } from 'lucide-react';
import { format } from 'date-fns';
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
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from "jspdf"
import "jspdf-autotable"
import html2canvas from 'html2canvas';

const DailyExpensesPage: FC = () => {
  const { toast } = useToast();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [games, setGames] = useState<GameHistory[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null);
  const [paidPlayerIds, setPaidPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendMessageModalOpen, setSendMessageModalOpen] = useState(false);

  const PLAYER_ENTRY_FEE = 2500;

  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    const clubId = localStorage.getItem('chip-maestro-clubId');
    if (userStr && clubId) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.isAdmin) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/dashboard');
        return;
      }
      getClub(clubId).then(setActiveClub);
      getGameHistory().then(allGames => {
        const clubGames = allGames.filter(g => g.clubId === clubId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setGames(clubGames);
        if (clubGames.length > 0) {
            const today = new Date();
            const todayGame = clubGames.find(g => format(new Date(g.timestamp), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
            const gameToSelect = todayGame || clubGames[0];
            setSelectedGame(gameToSelect);
            setPaidPlayerIds(gameToSelect.paidPlayerIds ?? (gameToSelect.players?.map(p => p.id) || []));
        }
        setIsLoading(false);
      });
    } else {
      router.push('/login');
    }
  }, [router, toast]);
  
  const handleSelectGame = (gameId: string) => {
    const game = games.find(g => g.id === gameId) || null;
    setSelectedGame(game);
    if (game) {
        setPaidPlayerIds(game.paidPlayerIds ?? (game.players?.map(p => p.id) || []));
    } else {
        setPaidPlayerIds([]);
    }
  };

  const handleExpenseChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    if (!selectedGame) return;
    const newExpenses = [...(selectedGame.expenses || [])];
    const expenseToUpdate = { ...newExpenses[index] };
    if (field === 'amount') {
      expenseToUpdate[field] = Number(value);
    } else {
      expenseToUpdate[field] = value as string;
    }
    newExpenses[index] = expenseToUpdate;
    setSelectedGame({ ...selectedGame, expenses: newExpenses });
  };

  const addExpense = () => {
    if (!selectedGame) return;
    const newExpenses = [...(selectedGame.expenses || []), { name: '', amount: 0 }];
    setSelectedGame({ ...selectedGame, expenses: newExpenses });
  };

  const removeExpense = (index: number) => {
    if (!selectedGame) return;
    const newExpenses = (selectedGame.expenses || []).filter((_, i) => i !== index);
    setSelectedGame({ ...selectedGame, expenses: newExpenses });
  };
  
  const handlePlayerPayToggle = (playerId: string, isPaid: boolean) => {
    setPaidPlayerIds(prev => isPaid ? [...prev, playerId] : prev.filter(id => id !== playerId));
  };

  const handleSelectAllPlayers = (isChecked: boolean) => {
    if (!selectedGame) return;
    setPaidPlayerIds(isChecked ? selectedGame.players.map(p => p.id) : []);
  };


  const accountingSummary = useMemo(() => {
    if (!selectedGame) return { totalEntryFees: 0, totalExpenses: 0, netProfit: 0 };
    const totalEntryFees = paidPlayerIds.length * PLAYER_ENTRY_FEE;
    const totalExpenses = (selectedGame.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalEntryFees - totalExpenses;
    return { totalEntryFees, totalExpenses, netProfit };
  }, [selectedGame, paidPlayerIds, PLAYER_ENTRY_FEE]);

  const handleSave = async () => {
    if (!selectedGame) return;
    setIsSaving(true);
    try {
      const gameToSave = { ...selectedGame, playerEntryFee: PLAYER_ENTRY_FEE, paidPlayerIds };
      await saveGameHistory(gameToSave);
      toast({ title: 'Expenses Saved', description: 'The financial data for this game has been updated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save expenses.' });
    } finally {
      setIsSaving(false);
    }
  };

    const handleExportPdf = async () => {
        if (!selectedGame) {
            toast({ variant: "destructive", title: "Export Error", description: "No game selected." });
            return;
        }
        
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Title
            doc.setFontSize(20);
            doc.text("Daily Expenses & Accounting", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(12);
            doc.text(`${selectedGame.venue} - ${format(new Date(selectedGame.timestamp), 'PPP')}`, pageWidth / 2, 22, { align: "center" });

            // Summary Table
            (doc as any).autoTable({
                startY: 30,
                head: [['Description', 'Amount']],
                body: [
                    ['Total Entry Fees Collected', `+ ₹${accountingSummary.totalEntryFees.toFixed(2)}`],
                    ['Total Expenses', `- ₹${accountingSummary.totalExpenses.toFixed(2)}`],
                    ['Cash in Hand', `₹${accountingSummary.netProfit.toFixed(2)}`],
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                foot: [
                    [{ content: 'Cash in Hand', colSpan: 1, styles: { fontStyle: 'bold' } }, { content: `₹${accountingSummary.netProfit.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' }}]
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
            if (selectedGame.expenses && selectedGame.expenses.length > 0) {
                 (doc as any).autoTable({
                    startY: summaryTableEnd + 10,
                    head: [['Expense Name', 'Amount']],
                    body: selectedGame.expenses.map(exp => [exp.name, `₹${exp.amount.toFixed(2)}`]),
                    theme: 'striped',
                    headStyles: { fillColor: [22, 160, 133] },
                 });
            }

            // Players Table
            if (selectedGame.players && selectedGame.players.length > 0) {
                 (doc as any).autoTable({
                    startY: (doc as any).lastAutoTable.finalY + 10,
                    head: [['Player Name', 'Entry Fee Paid']],
                    body: selectedGame.players.map(player => [
                        player.name,
                        paidPlayerIds.includes(player.id) ? 'Yes' : 'No'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [142, 68, 173] },
                });
            }
            
            const filename = `daily-expenses-${format(new Date(selectedGame.timestamp), 'yyyy-MM-dd')}.pdf`;
            doc.save(filename);
            toast({ title: 'Report Exported', description: 'Your report has been downloaded as a PDF.' });

        } catch (error) {
            console.error("Failed to export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "Could not generate the PDF report." });
        } finally {
            setIsExporting(false);
        }
    };


  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote /> Daily Expenses & Accounting</CardTitle>
          <CardDescription>Manage entry fees, expenses, and profit/loss for your games.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
                <Label>Select Game</Label>
                <Select
                    value={selectedGame?.id}
                    onValueChange={handleSelectGame}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a game to manage..." />
                    </SelectTrigger>
                    <SelectContent>
                        {games.map(g => (
                            <SelectItem key={g.id} value={g.id}>
                                {g.venue} - {format(new Date(g.timestamp), 'PPP')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {selectedGame && (
                <>
                    <div ref={reportRef} className="space-y-4 bg-background p-0 md:p-4 rounded-lg">
                        <Card className="bg-muted/50">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Label className="text-sm font-medium text-muted-foreground">Cash in Hand</Label>
                                <p className={cn("text-4xl font-bold tracking-tighter", accountingSummary.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                    ₹{accountingSummary.netProfit.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Income (Entry Fee: ₹{PLAYER_ENTRY_FEE})</h3>
                                <Card>
                                    <CardHeader className='p-4'>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="select-all-players"
                                                checked={selectedGame.players.length > 0 && paidPlayerIds.length === selectedGame.players.length}
                                                onCheckedChange={handleSelectAllPlayers}
                                            />
                                            <Label htmlFor="select-all-players" className="text-base font-semibold">
                                                Select All Players
                                            </Label>
                                        </div>
                                    </CardHeader>
                                    <CardContent className='p-4 pt-0'>
                                        <ScrollArea className="h-48 border rounded-md p-2">
                                        {selectedGame.players?.length > 0 ? selectedGame.players.map(player => (
                                            <div key={player.id} className="flex items-center space-x-3 p-1">
                                                <Checkbox
                                                    id={`player-${player.id}`}
                                                    checked={paidPlayerIds.includes(player.id)}
                                                    onCheckedChange={checked => handlePlayerPayToggle(player.id, !!checked)}
                                                />
                                                <Label htmlFor={`player-${player.id}`} className="flex-1 cursor-pointer">{player.name}</Label>
                                            </div>
                                        )) : <p className="text-center text-sm text-muted-foreground p-4">No players in this game.</p>}
                                        </ScrollArea>
                                    </CardContent>
                                    <CardFooter className='p-4'>
                                        <div className="p-4 bg-muted rounded-md text-sm w-full">
                                            <div className="flex justify-between">
                                                <span>Number of Paid Players:</span>
                                                <span>{paidPlayerIds.length}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold mt-2">
                                                <span>Total Entry Fees Collected:</span>
                                                <span>₹{accountingSummary.totalEntryFees.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Expenses</h3>
                                <div className="space-y-2">
                                {(selectedGame.expenses || []).map((exp, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="Expense Name (e.g., Rent)"
                                            value={exp.name}
                                            onChange={(e) => handleExpenseChange(index, 'name', e.target.value)}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Amount"
                                            value={exp.amount === 0 ? '' : exp.amount}
                                            onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                                            className="w-32"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeExpense(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={addExpense}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Expense
                                </Button>
                            </div>
                        </div>
                         <Separator />
                        <Card>
                            <CardHeader>
                                <CardTitle>Financial Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Total Entry Fees Collected</TableCell>
                                            <TableCell className="text-right font-mono text-green-600">+ ₹{accountingSummary.totalEntryFees.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Total Expenses</TableCell>
                                            <TableCell className="text-right font-mono text-red-600">- ₹{accountingSummary.totalExpenses.toFixed(2)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold text-lg">
                                            <TableCell>Cash in Hand</TableCell>
                                            <TableCell className={cn("text-right font-mono", accountingSummary.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                                ₹{accountingSummary.netProfit.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
          </div>
        </CardContent>
         <CardFooter className="flex justify-between">
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSendMessageModalOpen(true)} disabled={!selectedGame}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send to Group
                </Button>
                 <Button onClick={handleExportPdf} disabled={!selectedGame || isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
                    Export PDF
                </Button>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !selectedGame}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Expenses
            </Button>
        </CardFooter>
      </Card>
      
      {selectedGame && activeClub && (
        <SendExpenseSummaryDialog
            isOpen={isSendMessageModalOpen}
            onOpenChange={setSendMessageModalOpen}
            game={selectedGame}
            club={activeClub}
            summary={accountingSummary}
            toast={toast}
        />
      )}
    </div>
  );
};

const SendExpenseSummaryDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    game: GameHistory;
    club: Club;
    summary: { totalEntryFees: number; totalExpenses: number; netProfit: number };
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, game, club, summary, toast }) => {
    const [isSending, setIsSending] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const message = useMemo(() => {
        let msg = `*Financial Summary for ${game.venue} on ${format(new Date(game.timestamp), 'PPP')}*\n\n`;
        msg += `Paid Players: ${game.paidPlayerIds?.length || game.players?.length || 0}\n`;
        msg += `Entry Fee per Player: ₹${game.playerEntryFee || 0}\n`;
        msg += `----------------------------------\n`;
        msg += `*Total Income:* ₹${summary.totalEntryFees.toFixed(2)}\n\n`;
        msg += `*Expenses:*\n`;
        if ((game.expenses || []).length > 0) {
            (game.expenses || []).forEach(exp => {
                msg += `- ${exp.name}: ₹${exp.amount.toFixed(2)}\n`;
            });
        } else {
            msg += `- No expenses recorded.\n`;
        }
        msg += `\n*Total Expenses:* ₹${summary.totalExpenses.toFixed(2)}\n\n`;
        msg += `----------------------------------\n`;
        msg += `*Cash in Hand:* ₹${summary.netProfit.toFixed(2)}\n`;
        
        return msg;
    }, [game, summary]);

    const handleSend = async () => {
        const groupId = club.whatsappConfig?.whatsappGroupId;
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
                        A summary of the game's finances will be sent to the configured WhatsApp group.
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
                            {isSending ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send to Group
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


export default DailyExpensesPage;
