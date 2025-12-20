
'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
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
import { Loader2, Plus, Save, Trash2, Banknote, MessageSquare, Send } from 'lucide-react';
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

const DailyExpensesPage: FC = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [games, setGames] = useState<GameHistory[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendMessageModalOpen, setSendMessageModalOpen] = useState(false);

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
        const clubGames = allGames.filter(g => g.clubId === clubId);
        setGames(clubGames);
        if (clubGames.length > 0) {
            const today = new Date();
            const todayGame = clubGames.find(g => format(new Date(g.timestamp), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
            setSelectedGame(todayGame || clubGames[0]);
        }
        setIsLoading(false);
      });
    } else {
      router.push('/login');
    }
  }, [router, toast]);
  
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

  const accountingSummary = useMemo(() => {
    if (!selectedGame) return { totalEntryFees: 0, totalExpenses: 0, netProfit: 0 };
    const totalEntryFees = (selectedGame.players?.length || 0) * (selectedGame.playerEntryFee || 0);
    const totalExpenses = (selectedGame.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalEntryFees - totalExpenses;
    return { totalEntryFees, totalExpenses, netProfit };
  }, [selectedGame]);

  const handleSave = async () => {
    if (!selectedGame) return;
    setIsSaving(true);
    try {
      await saveGameHistory(selectedGame);
      toast({ title: 'Expenses Saved', description: 'The financial data for this game has been updated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save expenses.' });
    } finally {
      setIsSaving(false);
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
                    onValueChange={(gameId) => setSelectedGame(games.find(g => g.id === gameId) || null)}
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
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Income</h3>
                            <div className="space-y-2">
                                <Label htmlFor="entry-fee">Player Entry Fee (per player)</Label>
                                <Input
                                    id="entry-fee"
                                    type="number"
                                    value={selectedGame.playerEntryFee || 0}
                                    onChange={(e) => setSelectedGame({ ...selectedGame, playerEntryFee: Number(e.target.value) })}
                                />
                            </div>
                            <div className="p-4 bg-muted rounded-md text-sm">
                                <div className="flex justify-between">
                                    <span>Number of Players:</span>
                                    <span>{selectedGame.players?.length || 0}</span>
                                </div>
                                <div className="flex justify-between font-semibold mt-2">
                                    <span>Total Entry Fees Collected:</span>
                                    <span>₹{accountingSummary.totalEntryFees.toFixed(2)}</span>
                                </div>
                            </div>
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
                                        <TableCell>Net Profit / Loss</TableCell>
                                        <TableCell className={cn("text-right font-mono", accountingSummary.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                            ₹{accountingSummary.netProfit.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
          </div>
        </CardContent>
         <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={() => setSendMessageModalOpen(true)} disabled={!selectedGame}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send to Group
            </Button>
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

    const message = useMemo(() => {
        let msg = `*Financial Summary for ${game.venue} on ${format(new Date(game.timestamp), 'PPP')}*\n\n`;
        msg += `Total Players: ${game.players?.length || 0}\n`;
        msg += `Entry Fee: ₹${game.playerEntryFee || 0}\n`;
        msg += `----------------------------------\n`;
        msg += `*Total Income:* ₹${summary.totalEntryFees.toFixed(2)}\n\n`;
        msg += `*Expenses:*\n`;
        (game.expenses || []).forEach(exp => {
            msg += `- ${exp.name}: ₹${exp.amount.toFixed(2)}\n`;
        });
        msg += `*Total Expenses:* ₹${summary.totalExpenses.toFixed(2)}\n\n`;
        msg += `----------------------------------\n`;
        msg += `*Net Profit/Loss:* ₹${summary.netProfit.toFixed(2)}\n`;
        
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
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send to Group
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


export default DailyExpensesPage;

    