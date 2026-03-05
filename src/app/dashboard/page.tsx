

"use client"
// firebase
import { useState, useEffect, useMemo, useCallback, useRef, type FC, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation';
import { detectAnomalousBuyins } from "@/ai/flows/detect-anomalies"
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message"
import { sendBuyInOtp } from "@/ai/flows/send-buyin-otp"
import { importGameFromText } from "@/ai/flows/import-game"
import { sendDeletePlayerOtp } from "@/ai/flows/send-delete-player-otp";
import { sendDeleteGameOtp } from "@/ai/flows/send-delete-game-otp";
import { sendBookingOtp } from "@/ai/flows/send-booking-otp";
import type { Player, MasterPlayer, MasterVenue, GameHistory, CalculatedPlayer, WhatsappConfig, Club, BuyIn, GameProgressLog, PlayerProgress, ScheduledGame, SeatBooking, GameExpense, OnlineClub, OnlineLedgerEntry } from "@/lib/types"
import { calculateInterPlayerTransfers } from "@/lib/game-logic"
import { ChipDistributionChart } from "@/components/ChipDistributionChart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Trash2,
  Users,
  Save,
  FileDown,
  History,
  BookUser,
  Loader2,
  ShieldAlert,
  Crown,
  Share2,
  Pencil,
  CheckCircle2,
  TimerIcon,
  MoreVertical,
  Settings,
  Upload,
  AlertCircle,
  CalendarIcon,
  MessageCircleCode,
  X,
  Database,
  Wifi,
  WifiOff,
  LogOut,
  UserCheck,
  UserCog,
  User,
  Send,
  UserMinus,
  UserPlus,
  LogIn,
  Hourglass,
  Check,
  Info,
  Merge,
  SortAsc,
  ArrowRight,
  MapIcon,
  Clock,
  Building,
  KeyRound,
  FileText,
  StopCircle,
  Minus,
  ArrowUp,
  ArrowDown,
  TestTube,
  CalendarCheck,
  CalendarPlus,
  Banknote,
  LayoutDashboard,
  MessageSquare,
  Copy,
  Landmark,
} from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import html2canvas from 'html2canvas';
import { format, isSameDay, set, intervalToDuration, addHours, differenceInMilliseconds, formatDuration, parse, parseISO } from "date-fns"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, ZAxis } from "recharts"
import { cn } from "@/lib/utils"
import { getGameHistory, saveGameHistory, deleteGameHistory } from "@/services/game-service"
import { getMasterPlayers, saveMasterPlayer, deleteMasterPlayer } from "@/services/player-service"
import { getMasterVenues, saveMasterVenue, deleteMasterVenue } from "@/services/venue-service"
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getClub, getClubs } from "@/services/club-service"
import { getScheduledGamesForClub, getSeatBookingsForGame, createSeatBooking, updateSeatBooking, cancelSeatBooking, getScheduledGame, createScheduledGame, deleteScheduledGame } from "@/services/booking-service"
import { getOnlineClubs, getOnlineLedgerEntries } from '@/services/online-club-service';


const WhatsappIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );

type DbStatus = 'checking' | 'connected' | 'error';
type BuyInRequest = BuyIn & { playerName: string; playerId: string };


const tabColors = [
    "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200",
    "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
    "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200",
    "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200",
    "bg-lime-100 dark:bg-lime-900/50 text-lime-800 dark:text-lime-200",
    "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200",
];

const PlayerTimelineAnalysis: FC<{
  game: GameHistory;
  calculatedPlayers: CalculatedPlayer[];
  activeTab: string;
}> = ({ game, calculatedPlayers, activeTab }) => {

  const getPlayerTimeline = (playerName: string) => {
    type TimelineEvent = {
        timestamp: string;
        type: 'Buy-in' | 'Progress Save';
        details: string;
        profitLoss?: number;
        previousProfitLoss?: number;
    };

    const events: TimelineEvent[] = [];

    const player = game.players.find(p => p.name === playerName);

    const playerLastProfitLoss = new Map<string, number>();
    (game.progressLog || []).forEach(log => {
        log.playerStats.forEach(stat => {
            if (stat.name === playerName) {
                const previousProfitLoss = playerLastProfitLoss.get(stat.playerId);
                events.push({
                    timestamp: log.timestamp,
                    type: 'Progress Save',
                    details: `P/L: ₹${stat.profitLoss.toFixed(0)}`,
                    profitLoss: stat.profitLoss,
                    previousProfitLoss: previousProfitLoss
                });
                playerLastProfitLoss.set(stat.playerId, stat.profitLoss);
            }
        });
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const renderStatus = (event: ReturnType<typeof getPlayerTimeline>[0]) => {
      if (event.type !== 'Progress Save' || typeof event.previousProfitLoss === 'undefined') {
          return <Minus className="h-4 w-4 text-muted-foreground" />;
      }
      if (event.profitLoss! > event.previousProfitLoss) {
          return <ArrowUp className="h-4 w-4 text-green-500" />;
      }
      if (event.profitLoss! < event.previousProfitLoss) {
          return <ArrowDown className="h-4 w-4 text-red-500" />;
      }
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Player Timeline Analysis</CardTitle>
            <CardDescription>Chronological view of buy-ins and saved progress points for each player.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calculatedPlayers.map(player => (
              <div key={player.id}>
                <h3 className="font-semibold text-lg mb-2">{player.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPlayerTimeline(player.name).map((event, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground">{format(new Date(event.timestamp), 'p')}</TableCell>
                        <TableCell>{event.type}</TableCell>
                        <TableCell>{event.details}</TableCell>
                        <TableCell>{renderStatus(event)}</TableCell>
                      </TableRow>
                    ))}
                    {getPlayerTimeline(player.name).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No timeline data available.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
    </Card>
  );
};

const PlayerSummaryTable: FC<{ calculatedPlayers: CalculatedPlayer[] }> = ({ calculatedPlayers }) => {
    const { grandTotalBuyin, grandTotalChips, grandTotalProfitLoss } = useMemo(() => {
        if (!calculatedPlayers) return { grandTotalBuyin: 0, grandTotalChips: 0, grandTotalProfitLoss: 0 };
        return {
            grandTotalBuyin: calculatedPlayers.reduce((sum, p) => sum + p.totalBuyIns, 0),
            grandTotalChips: calculatedPlayers.reduce((sum, p) => sum + p.finalChips, 0),
            grandTotalProfitLoss: calculatedPlayers.reduce((sum, p) => sum + p.profitLoss, 0)
        };
    }, [calculatedPlayers]);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="px-2 sm:px-4">Player</TableHead>
                    <TableHead className="text-right px-2 sm:px-4">Buy-in</TableHead>
                    <TableHead className="text-right px-2 sm:px-4">Return</TableHead>
                    <TableHead className="text-right px-2 sm:px-4">P/L</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {calculatedPlayers.map((p) => (
                    <TableRow key={p.id} className="text-xs sm:text-sm">
                        <TableCell className="font-medium px-2 sm:px-4">{p.name}</TableCell>
                        <TableCell className="text-right px-2 sm:px-4">₹{p.totalBuyIns}</TableCell>
                        <TableCell className="text-right px-2 sm:px-4">₹{p.finalChips}</TableCell>
                        <TableCell className={`text-right font-bold px-2 sm:px-4 ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{p.profitLoss.toFixed(0)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFoot>
                <TableRow className="font-bold border-t-2 border-foreground text-xs sm:text-sm">
                    <TableCell className="px-2 sm:px-4">Totals</TableCell>
                    <TableCell className="text-right px-2 sm:px-4">₹{grandTotalBuyin}</TableCell>
                    <TableCell className="text-right px-2 sm:px-4">₹{grandTotalChips}</TableCell>
                    <TableCell className={`text-right px-2 sm:px-4 ${grandTotalProfitLoss === 0 ? '' : 'text-destructive'}`}>
                        ₹{grandTotalProfitLoss.toFixed(0)}
                    </TableCell>
                </TableRow>
            </TableFoot>
        </Table>
    );
};

const AdminView: FC<{
    activeGame: GameHistory;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    updatePlayer: (id: string, newValues: Partial<Player>) => void;
    removePlayer: (id: string) => void;
    isOtpVerificationEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    canEdit: boolean;
    currentUser: MasterPlayer | null;
    setAddPlayerModalOpen: (isOpen: boolean) => void;
    setSaveConfirmOpen: (isOpen: boolean) => void;
    setEndGameConfirmOpen: (isOpen: boolean) => void;
    setReportsModalOpen: (isOpen: boolean) => void;
    setSendBuyInSummaryOpen: (isOpen: boolean) => void;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({
    activeGame, activeTab, setActiveTab, updatePlayer, removePlayer,
    isOtpVerificationEnabled, whatsappConfig, canEdit, currentUser, setAddPlayerModalOpen,
    setSaveConfirmOpen, setEndGameConfirmOpen, setReportsModalOpen, setSendBuyInSummaryOpen, toast
}) => {
    
    const players = activeGame.players || [];

    const calculatedPlayers = useMemo((): CalculatedPlayer[] => {
        if (!activeGame || !activeGame.players) return [];
        return activeGame.players.map(p => {
            const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
            return {
                ...p,
                totalBuyIns,
                profitLoss: p.finalChips - totalBuyIns,
            }
        }).sort((a,b) => b.profitLoss - a.profitLoss);
    }, [activeGame]);
    
    if (players.length === 0 && canEdit) {
        return (
             <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-10">
                        <p className="text-muted-foreground mb-4">No players in the game.</p>
                        <Button onClick={() => setAddPlayerModalOpen(true)} disabled={!canEdit}><Plus className="mr-2 h-4 w-4" />Add Players</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 h-auto flex-wrap">
                            {players.map(p => (
                                <TabsTrigger key={p.id} value={p.id}>{p.name || "New Player"}</TabsTrigger>
                            ))}
                        </TabsList>
                        {players.map((p) => (
                            <TabsContent key={p.id} value={p.id} className="mt-4">
                                <PlayerCard
                                    player={p}
                                    onUpdate={updatePlayer}
                                    onRemove={removePlayer}
                                    isOtpEnabled={isOtpVerificationEnabled}
                                    whatsappConfig={whatsappConfig}
                                    canEdit={canEdit}
                                    currentUser={currentUser}
                                    toast={toast}
                                    activeGame={activeGame}
                                />
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <>
                                <Button size="sm" onClick={() => setAddPlayerModalOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Add Player(s)</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
                                <Button size="sm" onClick={() => setSaveConfirmOpen(true)} variant="secondary" disabled={!canEdit}>
                                    <Save className="mr-2 h-4 w-4" />Count
                                </Button>
                                <Button size="sm" onClick={() => setEndGameConfirmOpen(true)} variant="destructive">
                                    <StopCircle className="mr-2 h-4 w-4" />End
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setSendBuyInSummaryOpen(true)} variant="outline" className="bg-green-500 text-white hover:bg-green-600 hover:text-white">
                            <WhatsappIcon />
                            <span className="ml-2">WhatsApp</span>
                        </Button>
                        <Button size="sm" onClick={() => setReportsModalOpen(true)} variant="outline"><FileDown className="mr-2 h-4 w-4" />Reports</Button>
                    </div>
                </CardFooter>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Player Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <PlayerSummaryTable calculatedPlayers={calculatedPlayers} />
                </CardContent>
            </Card>

            {activeGame.progressLog && activeGame.progressLog.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg font-semibold">Player Timeline Analysis</AccordionTrigger>
                        <AccordionContent>
                            <PlayerTimelineAnalysis game={activeGame} calculatedPlayers={calculatedPlayers} activeTab={activeTab} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
             )}
              <Card>
                <CardHeader><CardTitle>Player Buy-in Summary</CardTitle></CardHeader>
                <CardContent>
                    <PlayerBuyInSummaryTable calculatedPlayers={calculatedPlayers} />
                </CardContent>
              </Card>
        </div>
    );
};


const PlayerView: FC<{
    currentUser: MasterPlayer;
    joinableGame: GameHistory | null;
    onJoinGame: (gameId: string) => void;
    setLoadGameModalOpen: (isOpen: boolean) => void;
}> = ({ currentUser, joinableGame, onJoinGame, setLoadGameModalOpen }) => {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Welcome, {currentUser?.name}</CardTitle>
                    {joinableGame ? (
                        <CardDescription>A game is currently active!</CardDescription>
                    ) : (
                        <CardDescription>There are no games running right now.</CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {joinableGame ? (
                        <div className="space-y-2">
                            <p className="font-semibold">{joinableGame.venue}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(joinableGame.timestamp), "PPP")}</p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">You can view past games or wait for an admin to start a new one.</p>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {joinableGame ? (
                        <Button onClick={() => onJoinGame(joinableGame.id)} className="w-full">
                            <LogIn className="mr-2 h-4 w-4" /> Join Game
                        </Button>
                    ) : (
                        <Button onClick={() => setLoadGameModalOpen(true)} className="w-full">
                            <History className="mr-2 h-4 w-4" />
                            Load Previous Game
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};


const EditableVenue: FC<{
    venue: string;
    masterVenues: MasterVenue[];
    onVenueChange: (newVenue: string) => void;
    isAdmin: boolean;
}> = ({ venue, masterVenues, onVenueChange, isAdmin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentVenue, setCurrentVenue] = useState(venue);

    useEffect(() => {
        setCurrentVenue(venue);
    }, [venue]);

    const handleSave = () => {
        if (currentVenue.trim()) {
            onVenueChange(currentVenue.trim());
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setCurrentVenue(venue);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={currentVenue}
                    onChange={(e) => setCurrentVenue(e.target.value)}
                    className="h-9"
                />
                <Select onValueChange={(value) => setCurrentVenue(value)}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Or select" />
                    </SelectTrigger>
                    <SelectContent>
                        {masterVenues.map((v) => (
                            <SelectItem key={v.id} value={v.name}>
                                {v.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleSave} size="sm">Save</Button>
                <Button onClick={handleCancel} variant="ghost" size="sm">Cancel</Button>
            </div>
        );
    }

    return (
        <h1 className="text-2xl font-bold truncate flex items-center gap-2">
            {venue}
            {isAdmin && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            )}
        </h1>
    );
};

const EditableDate: FC<{
  date: string;
  onDateChange: (newDate: Date) => void;
  isAdmin: boolean;
}> = ({ date, onDateChange, isAdmin }) => {
  const [selectedDate, setSelectedDate] = useState(new Date(date));

  useEffect(() => {
    setSelectedDate(new Date(date));
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const originalTime = new Date(date);
      const updatedDate = set(newDate, {
        hours: originalTime.getHours(),
        minutes: originalTime.getMinutes(),
        seconds: originalTime.getSeconds(),
      });
      setSelectedDate(updatedDate);
      onDateChange(updatedDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" disabled={!isAdmin} className="px-2 h-auto py-0">
            {format(selectedDate, "dd MMMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
 captionLayout="dropdown"
          fromYear={1990}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  );
};

const OnlineAccountsSummaryCard: FC<{
    onlineClubs: OnlineClub[];
    ledger: OnlineLedgerEntry[];
}> = ({ onlineClubs, ledger }) => {

    const onlineClubCurrencyMap = useMemo(() => {
        const map = new Map<string, string>();
        onlineClubs.forEach(club => {
            if (club.name) {
                map.set(club.name, club.currency || '₹');
            }
        });
        return map;
    }, [onlineClubs]);

    const balanceByClub = useMemo(() => {
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

    const recentTransactionsByClub = useMemo(() => {
        const grouped: Record<string, OnlineLedgerEntry[]> = {};
        onlineClubs.forEach(club => {
            if (club.name) {
                grouped[club.name] = [];
            }
        });
        
        [...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .forEach(entry => {
                if (entry.onlineClubName && grouped[entry.onlineClubName]) {
                    if (grouped[entry.onlineClubName].length < 5) { // Limit to 5 recent
                        grouped[entry.onlineClubName].push(entry);
                    }
                }
            });
        return grouped;
    }, [ledger, onlineClubs]);
    
    if (onlineClubs.length === 0 && ledger.length === 0) return null;

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Landmark /> Online Accounts
                </CardTitle>
                <CardDescription>Click on a balance to view the full ledger.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {balanceByClub.map(club => (
                        <Link href="/online-club" key={club.name}>
                            <Badge variant="outline" className="text-base p-2 hover:bg-accent">
                                {club.name}: {club.currency}{club.balance.toFixed(0)}
                            </Badge>
                        </Link>
                    ))}
                </div>
                 {Object.keys(recentTransactionsByClub).length > 0 && (
                    <Tabs defaultValue={Object.keys(recentTransactionsByClub)[0]}>
                        <TabsList>
                            {Object.keys(recentTransactionsByClub).map(clubName => (
                                <TabsTrigger key={clubName} value={clubName}>{clubName}</TabsTrigger>
                            ))}
                        </TabsList>
                        {Object.entries(recentTransactionsByClub).map(([clubName, transactions]) => (
                            <TabsContent key={clubName} value={clubName} className="mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.length > 0 ? transactions.map(tx => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{format(parseISO(tx.date), 'dd MMM')}</TableCell>
                                                <TableCell className="capitalize">{tx.notes || tx.type}</TableCell>
                                                <TableCell className={cn("text-right font-mono", tx.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                    {tx.amount >= 0 ? '+' : ''}
                                                    {onlineClubCurrencyMap.get(clubName) || '₹'}
                                                    {Math.abs(tx.amount).toFixed(0)}
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No recent transactions.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        ))}
                    </Tabs>
                 )}
            </CardContent>
        </Card>
    );
};

// Main component with Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
    

function DashboardContent() {
  const { toast } = useToast()
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationSoundRef = useRef<HTMLAudioElement>(null);


  // Core State
  const [activeTab, setActiveTab] = useState<string>("");
  const [isDataReady, setIsDataReady] = useState(false);
  const [isOtpVerificationEnabled, setOtpVerificationEnabled] = useState(true);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [greeting, setGreeting] = useState('');


  // Master Data State
  const [allPlayers, setAllPlayers] = useState<MasterPlayer[]>([]);
  const [allVenues, setAllVenues] = useState<MasterVenue[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([]);
  
  // Game History & Results State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null);
  const [gameDuration, setGameDuration] = useState<string>("00:00:00");
  const [joinableGame, setJoinableGame] = useState<GameHistory | null>(null);
  const [hasCheckedForGame, setHasCheckedForGame] = useState(false);
  
  // Online Club State
  const [onlineClubs, setOnlineClubs] = useState<OnlineClub[]>([]);
  const [onlineLedger, setOnlineLedger] = useState<OnlineLedgerEntry[]>([]);

  // App Settings
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
    apiUrl: '',
    apiToken: '',
    senderMobile: ''
  });
  const [deckChangeInterval, setDeckChangeInterval] = useState(2); // in hours
  const [showDeckChangeAlert, setShowDeckChangeAlert] = useState(false);


  // Modal & Dialog State
  const [isGameCreationModalOpen, setGameCreationModalOpen] = useState(false);
  const [isLoadGameModalOpen, setLoadGameModalOpen] = useState(false);
  const [isReportsModalOpen, setReportsModalOpen] = useState(false);
  const [isSendMessageModalOpen, setSendMessageModalOpen] = useState(false);
  const [isSendBuyInSummaryOpen, setSendBuyInSummaryOpen] = useState(false);
  const [isImportGameModalOpen, setImportGameModalOpen] = useState(false);
  const [isSaveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [isEndGameConfirmOpen, setEndGameConfirmOpen] = useState(false);
  const [isAddPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [isSettlementModalOpen, setSettlementModalOpen] = useState(false);
  const [buyInRequestModal, setBuyInRequestModal] = useState<BuyInRequest | null>(null);
  const [isOtpModalOpen, setOtpModalOpen] = useState(false);

  
  const isAdmin = useMemo(() => currentUser?.isAdmin === true, [currentUser]);
  const isSuperAdmin = useMemo(() => currentUser?.whatsappNumber === '919843350000', [currentUser]);
  const isBanker = useMemo(() => {
    if (!currentUser) return false;
    const masterPlayer = masterPlayers.find(p => p.id === currentUser.id);
    return masterPlayer?.isBanker === true;
  }, [currentUser, masterPlayers]);

  const canEditGame = useMemo(() => {
    if (!activeGame || !currentUser) return false;
    if (isAdmin) return true;
    
    const masterPlayer = masterPlayers.find(mp => mp.id === currentUser.id);
    // Allow bankers to edit any game within their club.
    if (masterPlayer?.isBanker && masterPlayer.clubId === activeGame.clubId) {
        return true;
    }
    
    return false;
  }, [isAdmin, currentUser, activeGame, masterPlayers]);
  
  const isCurrentUserBankerInGame = useMemo(() => {
    if (!activeGame || !currentUser) return false;
    // Admins have all rights, no need for banker badge
    if (currentUser.isAdmin) return false;
    
    const masterPlayer = masterPlayers.find(mp => mp.id === currentUser.id);
    if (masterPlayer?.isBanker) {
        return activeGame.players.some(p => p.name === currentUser.name);
    }
    return false;
  }, [activeGame, currentUser, masterPlayers]);


  // Load user data and check auth
  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    const clubId = localStorage.getItem('chip-maestro-clubId');
    
    if (userStr && clubId) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    } else {
      router.replace('/');
    }
  }, [router]);

  // Set greeting message
  useEffect(() => {
    if (currentUser && activeClub) {
      setGreeting(`Hi, ${currentUser.name}!`);
    }
  }, [currentUser, activeClub]);

  const loadGameIntoState = useCallback(async (gameToLoad: GameHistory) => {
        setActiveGame(gameToLoad);
        if (gameToLoad.players.length > 0) {
          const currentUserInGame = gameToLoad.players.find(p => p.name === currentUser?.name);
          if (currentUserInGame) {
            setActiveTab(currentUserInGame.id);
          } else if (isAdmin) {
            setActiveTab(gameToLoad.players[0].id);
          } else {
             setActiveTab("");
          }
        } else {
          setActiveTab("");
        }
  }, [currentUser, isAdmin]);

  // Load data from Firestore on initial render
  useEffect(() => {
    async function loadInitialData() {
        const clubId = localStorage.getItem('chip-maestro-clubId');
        if (!currentUser || !clubId) return;

        try {
            const [
                loadedClubs,
                loadedMasterPlayers,
                loadedMasterVenues,
                loadedGameHistory,
                loadedOnlineClubs,
                loadedOnlineLedger,
            ] = await Promise.all([
                getClubs(),
                getMasterPlayers(),
                getMasterVenues(),
                getGameHistory(),
                getOnlineClubs(),
                getOnlineLedgerEntries(currentUser.id),
            ]);

            setAllClubs(loadedClubs);
            setAllPlayers(loadedMasterPlayers);
            setAllVenues(loadedMasterVenues);
            setGameHistory(loadedGameHistory);
            setOnlineClubs(loadedOnlineClubs);
            setOnlineLedger(loadedOnlineLedger);
            
            const club = loadedClubs.find(c => c.id === clubId);

            if (!club) {
                toast({ variant: "destructive", title: "Club not found", description: "The selected club does not exist. Please select another club." });
                handleLogout();
                return;
            }
            setActiveClub(club);
            setWhatsappConfig(club.whatsappConfig || { apiUrl: '', apiToken: '', senderMobile: '' });
            setDeckChangeInterval(club.deckChangeIntervalHours || 2);
            
            setMasterPlayers(loadedMasterPlayers.filter(p => p.clubId === clubId));
            setMasterVenues(loadedMasterVenues.filter(v => v.clubId === clubId));
            
            const savedOtpPreference = localStorage.getItem("isOtpVerificationEnabled");
            if (savedOtpPreference !== null) {
                setOtpVerificationEnabled(JSON.parse(savedOtpPreference));
            }
            
            // Check for active games for non-admins
            if (!isAdmin) {
                const today = new Date();
                const activeGamesForClub = loadedGameHistory.filter(g => g.clubId === clubId);
                const activeGameForToday = activeGamesForClub.find(g => isSameDay(new Date(g.timestamp), today) && !g.endTime);
                
                if (activeGameForToday) {
                    const isPlayerInGame = activeGameForToday.players.some(p => p.name === currentUser.name);
                    if (isPlayerInGame) {
                        loadGameIntoState(activeGameForToday);
                    } else {
                        setJoinableGame(activeGameForToday);
                    }
                }
            }
            
        } catch (error) {
            console.error("Failed to load data from Firestore", error);
            toast({ variant: "destructive", title: "Data Loading Error", description: "Could not load data from the cloud. Please check your connection." });
        } finally {
            setIsDataReady(true);
            setHasCheckedForGame(true);
        }
    }
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAdmin]);
  
    // Real-time listener for active game
    useEffect(() => {
        if (!activeGame?.id) return;

        const unsub = onSnapshot(doc(db, "gameHistory", activeGame.id), (doc) => {
            if (doc.exists()) {
                const gameData = { id: doc.id, ...doc.data() } as GameHistory;
                const previousPlayerCount = activeGame?.players?.length ?? 0;

                // Preserve active tab if it still exists
                const activeTabExists = gameData.players.some(p => p.id === activeTab);
                
                setActiveGame(gameData);
                
                if (!activeTabExists) {
                    const currentUserInGame = gameData.players.find(p => p.name === currentUser?.name);
                    if (currentUserInGame) {
                       setActiveTab(currentUserInGame.id);
                    } else if (gameData.players.length > 0) {
                       setActiveTab(gameData.players[0].id)
                    } else {
                       setActiveTab("")
                    }
                }
            } else {
                // Game was deleted by another user
                toast({ title: "Game Ended", description: "The game you were in has been deleted."});
                setActiveGame(null);
            }
        });

        return () => unsub();
    }, [activeGame?.id, activeTab, currentUser?.name, toast]);

    const prevBuyInRequestsRef = useRef<string[]>([]);
    
    // Effect for buy-in request notifications
    useEffect(() => {
      if (!isAdmin || !activeGame) return;
  
      const currentRequests: BuyInRequest[] = (activeGame.players || [])
          .flatMap(p => 
              (p.buyIns || [])
                  .filter(b => b.status === 'requested')
                  .map(b => ({ ...b, playerName: p.name, playerId: p.id }))
          );
      
      const currentRequestIds = currentRequests.map(r => r.id);
      const prevRequestIds = prevBuyInRequestsRef.current;
      
      const newRequests = currentRequests.filter(r => !prevRequestIds.includes(r.id));
      
      if (newRequests.length > 0) {
          // Open modal for the first new request found
          if (!buyInRequestModal) {
            setBuyInRequestModal(newRequests[0]);
          }
      }
      
      prevBuyInRequestsRef.current = currentRequestIds;
  
  }, [activeGame, isAdmin, buyInRequestModal]);


  // Persist non-firestore data to localStorage whenever they change
  useEffect(() => {
    if(!isDataReady) return;
    localStorage.setItem("isOtpVerificationEnabled", JSON.stringify(isOtpVerificationEnabled));
  }, [isOtpVerificationEnabled, isDataReady])

  // Game timer effect
  useEffect(() => {
      if (!activeGame?.startTime) {
          setGameDuration("00:00:00");
          return;
      }
      
      const gameStartTime = new Date(activeGame.startTime);
      const gameEndTime = activeGame.endTime ? new Date(activeGame.endTime) : null;

      if (gameEndTime) {
          const duration = intervalToDuration({ start: gameStartTime, end: gameEndTime });
          const paddedHours = String(duration.hours || 0).padStart(2, '0');
          const paddedMinutes = String(duration.minutes || 0).padStart(2, '0');
          const paddedSeconds = String(duration.seconds || 0).padStart(2, '0');
          setGameDuration(`${paddedHours}:${paddedMinutes}:${paddedSeconds}`);
          return;
      }

    const timerInterval = setInterval(() => {
      const duration = intervalToDuration({ start: gameStartTime, end: new Date() });
      const paddedHours = String(duration.hours || 0).padStart(2, '0');
      const paddedMinutes = String(duration.minutes || 0).padStart(2, '0');
      const paddedSeconds = String(duration.seconds || 0).padStart(2, '0');
      setGameDuration(`${paddedHours}:${paddedMinutes}:${paddedSeconds}`);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeGame?.startTime, activeGame?.endTime]);
  
  // Deck change timer effect
  useEffect(() => {
    if (!activeGame?.startTime || activeGame.endTime || deckChangeInterval <= 0) {
        setShowDeckChangeAlert(false);
        return;
    }

    const startTime = new Date(activeGame.startTime);
    let nextChangeTime = addHours(startTime, deckChangeInterval);
    const now = new Date();

    // Find the next change time that is in the future
    while (nextChangeTime < now) {
        nextChangeTime = addHours(nextChangeTime, deckChangeInterval);
    }

    const alertTime = new Date(nextChangeTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    
    let alertTimeout: NodeJS.Timeout | null = null;
    
    if (alertTime > now) {
        const timeToAlert = differenceInMilliseconds(alertTime, now);
        alertTimeout = setTimeout(() => {
            setShowDeckChangeAlert(true);
            notificationSoundRef.current?.play().catch(error => console.error("Audio play failed:", error));
        }, timeToAlert);
    }
    
    return () => {
        if (alertTimeout) {
            clearTimeout(alertTimeout);
        }
    };
}, [activeGame?.startTime, activeGame?.endTime, deckChangeInterval]);


  const handleLogout = () => {
    localStorage.removeItem('chip-maestro-user');
    localStorage.removeItem('chip-maestro-clubId');
    sessionStorage.removeItem('seenOtpModal');
    setActiveGame(null);
    setJoinableGame(null);
    router.replace('/');
  };

  const addPlayers = async (playersToAdd: MasterPlayer[]) => {
      if (!activeGame) return;

      const newPlayers: Player[] = playersToAdd.map(playerToAdd => ({
          id: `player-${Date.now()}-${playerToAdd.id}`,
          name: playerToAdd.name,
          whatsappNumber: playerToAdd.whatsappNumber,
          buyIns: [],
          finalChips: 0,
          clubId: activeGame.clubId,
      }));
      
      const updatedGame = {
          ...activeGame,
          players: [...activeGame.players, ...newPlayers]
      };
      
      await saveGameHistory(updatedGame);
      
      if (activeTab === "" && newPlayers.length > 0) {
          setActiveTab(newPlayers[0].id);
      }
  };


  const removePlayer = async (idToRemove: string) => {
    if (!activeGame) return;
    const updatedPlayers = activeGame.players.filter(p => p.id !== idToRemove);
    await saveGameHistory({ ...activeGame, players: updatedPlayers });

    if (activeTab === idToRemove) {
      setActiveTab(updatedPlayers.length > 0 ? updatedPlayers[0].id : "")
    }
  }
  
  const updatePlayer = async (id: string, newValues: Partial<Player>) => {
    if (!activeGame) return;
    const updatedPlayers = activeGame.players.map(p => p.id === id ? { ...p, ...newValues } : p);
    // Debounce this in a real app, but for now, save on every change.
    await saveGameHistory({ ...activeGame, players: updatedPlayers });
  };
  
  const handleSaveGameProgress = async (finalPlayers: CalculatedPlayer[]) => {
        if (!activeGame || !activeClub) return;

        if (finalPlayers.length === 0) {
            toast({ variant: "destructive", title: "Cannot Save Game", description: "There is no active game data to save." });
            return;
        }

        if (finalPlayers.some(p => !p.name)) {
            toast({ variant: "destructive", title: "Cannot Save Game", description: "Please ensure all players have a name." });
            return;
        }

        const serializablePlayers = finalPlayers.map(p => ({
            id: p.id,
            name: p.name,
            whatsappNumber: p.whatsappNumber,
            buyIns: p.buyIns.map(b => ({ id: b.id, amount: b.amount, timestamp: b.timestamp, status: b.status })),
            finalChips: p.finalChips,
            clubId: activeClub.id,
        }));
        
        const progressLogEntry: GameProgressLog = {
            timestamp: new Date().toISOString(),
            playerStats: finalPlayers.map(p => ({
                playerId: p.id,
                name: p.name,
                totalBuyIns: p.totalBuyIns,
                finalChips: p.finalChips,
                profitLoss: p.profitLoss,
            })),
        };
        
        const updatedProgressLog = [...(activeGame.progressLog || []), progressLogEntry];

        const progressGame: GameHistory = {
            ...activeGame,
            clubId: activeClub.id,
            players: serializablePlayers as any,
            progressLog: updatedProgressLog,
        }

        try {
            await saveGameHistory(progressGame);
            toast({ title: "Progress Saved!", description: `${progressGame.venue} has been updated in your history.` });
            setSaveConfirmOpen(false);
        } catch (error) {
            console.error("Failed to save game progress:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save game progress to the cloud." });
        }
    };

    const handleEndGame = async (finalPlayers: CalculatedPlayer[]) => {
        if (!activeGame || !activeClub) return;

        if (finalPlayers.some(p => (p.buyIns || []).some(b => b.status !== 'verified' && b.amount > 0))) {
            toast({ variant: "destructive", title: "Unverified Buy-ins", description: "Please verify all buy-ins before ending the game." });
            return;
        }

        const now = new Date();
        const serializablePlayers = finalPlayers.map(p => ({
            id: p.id,
            name: p.name,
            whatsappNumber: p.whatsappNumber,
            buyIns: p.buyIns.map(b => ({ id: b.id, amount: b.amount, timestamp: b.timestamp, status: b.status })),
            finalChips: p.finalChips,
            clubId: activeClub.id,
        }));

        const finalGame: GameHistory = {
            ...activeGame,
            clubId: activeClub.id,
            players: serializablePlayers as any,
            endTime: now.toISOString(),
            duration: activeGame.startTime ? (now.getTime() - new Date(activeGame.startTime).getTime()) : undefined
        };

        try {
            const savedGame = await saveGameHistory(finalGame);
            setGameHistory(prev => {
                const existingIndex = prev.findIndex(g => g.id === savedGame.id);
                if (existingIndex !== -1) {
                    const updated = [...prev];
                    updated[existingIndex] = savedGame;
                    return updated;
                }
                return [savedGame, ...prev];
            });
            toast({ title: "Game Ended!", description: `${finalGame.venue} has been saved to your history.` });
            setEndGameConfirmOpen(false);
        } catch (error) {
            console.error("Failed to save and end game:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save and end the game." });
        }
    };
  
    const handleJoinGame = async (gameId: string) => {
        const gameToJoin = gameHistory.find(g => g.id === gameId);
        if (gameToJoin && currentUser && activeClub) {
            
            const isAlreadyInGame = gameToJoin.players.some(p => p.name === currentUser.name);
            if(isAlreadyInGame) {
                await loadGameIntoState(gameToJoin);
                setJoinableGame(null);
                setLoadGameModalOpen(false);
                return;
            }

            const playerToAdd: MasterPlayer = {
                ...currentUser,
                clubId: activeClub.id,
            };
            
            const newPlayer: Player = {
                id: `player-${Date.now()}-${playerToAdd.id}`,
                name: playerToAdd.name,
                whatsappNumber: playerToAdd.whatsappNumber,
                buyIns: [],
                finalChips: 0,
                clubId: activeClub.id,
            };
            const updatedGame: GameHistory = {
                ...gameToJoin,
                players: [...gameToJoin.players, newPlayer]
            };
            await saveGameHistory(updatedGame);
            await loadGameIntoState(updatedGame);
            setJoinableGame(null); // Clear the joinable game state
            setLoadGameModalOpen(false);
        }
    };
    
  const handleLoadGame = async (gameId: string) => {
    const gameToLoad = gameHistory.find(g => g.id === gameId);
    if (gameToLoad && currentUser) {
        if (!gameToLoad.endTime) {
            // It's an active game, admins can load, players should join
            if (!isAdmin) {
                handleJoinGame(gameId);
                return;
            }
        }
        await loadGameIntoState(gameToLoad);
        setLoadGameModalOpen(false);
        toast({ title: "Game Loaded", description: `Loaded game from ${format(new Date(gameToLoad.timestamp), "dd/MMM/yy")}.` });
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!isAdmin) {
        toast({variant: 'destructive', title: 'Permission Denied', description: 'Only admins can delete games.'});
        return;
    }
    try {
        if(activeGame?.id === gameId) {
            setActiveGame(null);
        }
        await deleteGameHistory(gameId);
        const updatedHistory = gameHistory.filter(g => g.id !== gameId);
        setGameHistory(updatedHistory);
        toast({ title: "Game Deleted", description: "The selected game has been removed from your history." });
    } catch (error) {
        console.error("Failed to delete game:", error);
        toast({ variant: "destructive", title: "Delete Error", description: "Could not delete game from the cloud." });
    }
  };
  
  const handleNewGame = () => {
    setGameCreationModalOpen(true);
  }
  
  const handleStartGame = async (
    venue: string,
    date: Date,
    time: string,
    seats: number,
    preBookedPlayerIds: string[],
    clubIdForGame: string,
  ) => {
    
    const targetClubId = isSuperAdmin ? clubIdForGame : activeClub?.id;
    if (!targetClubId) {
        toast({ variant: "destructive", title: "Club not selected", description: "Please select a club to start the game in." });
        return;
    }
    
    const clubVenues = allVenues.filter(v => v.clubId === targetClubId);
    if (!clubVenues.some(v => v.name === venue)) {
        const venueData: Omit<MasterVenue, 'id'> = { name: venue, clubId: targetClubId };
        const savedVenue = await saveMasterVenue(venueData);
        setAllVenues(prev => [...prev, savedVenue]);
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const finalTimestamp = set(date, { hours, minutes, seconds: 0 }).toISOString();
    
    const clubPlayers = allPlayers.filter(p => p.clubId === targetClubId);
    const preBookedPlayers = clubPlayers.filter(p => preBookedPlayerIds.includes(p.id));
    
    const newGamePlayers: Player[] = preBookedPlayers.map(p => ({
        id: `player-${Date.now()}-${p.id}`,
        name: p.name,
        whatsappNumber: p.whatsappNumber,
        buyIns: [],
        finalChips: 0,
        clubId: targetClubId,
    }));

    const newGame: GameHistory = {
        id: `game-${Date.now()}`,
        venue: venue,
        timestamp: finalTimestamp,
        startTime: new Date().toISOString(),
        players: newGamePlayers,
        clubId: targetClubId,
        progressLog: [],
    };
    
    await saveGameHistory(newGame);
    await loadGameIntoState(newGame);
    
    toast({ title: "Game Started!", description: `A new game has started at ${venue}.` });
  }

  const handleVenueChange = async (newVenue: string) => {
    if (!activeGame || newVenue === activeGame.venue || !activeClub) return;

    if (!masterVenues.some(v => v.name === newVenue)) {
        const venueData: Omit<MasterVenue, 'id'> = { name: newVenue, clubId: activeClub.id };
        const savedVenue = await saveMasterVenue(venueData);
        setMasterVenues(prev => [...prev, savedVenue]);
    }

    const updatedGame = { ...activeGame, venue: newVenue };
    await saveGameHistory(updatedGame);
    setActiveGame(updatedGame);
    toast({ title: "Venue Updated", description: `The game venue has been changed to ${newVenue}.` });
  };
  
  const handleDateChange = async (newDate: Date) => {
    if (!activeGame) return;
    const updatedGame = { ...activeGame, timestamp: newDate.toISOString() };
    await saveGameHistory(updatedGame);
    setActiveGame(updatedGame);
    toast({ title: "Date Updated", description: `The game date has been changed.` });
  };

  const handleImportedGame = async (importedGame: { venue: string; timestamp: string; players: Player[] }) => {
    if (!activeClub) return;

    const existingMasterNames = masterPlayers.map(mp => mp.name);
    const newMasterPlayersPromises: Promise<MasterPlayer>[] = importedGame.players
        .filter(p => !existingMasterNames.includes(p.name))
        .map(async p => {
            const newPlayer: Omit<MasterPlayer, 'id'> = {
                name: p.name,
                whatsappNumber: p.whatsappNumber || "",
                isAdmin: false,
                isActive: true,
                clubId: activeClub.id,
            };
            return await saveMasterPlayer(newPlayer, { updateGames: false });
        });
    
    try {
        const createdPlayers = await Promise.all(newMasterPlayersPromises);
        if (createdPlayers.length > 0) {
            setMasterPlayers(prev => [...prev, ...createdPlayers]);
            toast({ title: "Players Added", description: `${createdPlayers.length} new player(s) have been added to your master list.`});
        }
    } catch (error) {
        console.error("Failed to save new master players from import:", error);
        toast({variant: "destructive", title: "Player Save Error", description: "Could not save new players to the database."});
    }

    const newGameDate = new Date(importedGame.timestamp);
    
    const serializablePlayers = importedGame.players.map(p => {
        const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? (bi.amount || 0) : 0), 0);
        return {
            id: p.id,
            name: p.name,
            whatsappNumber: p.whatsappNumber || "",
            buyIns: (p.buyIns || []).map(b => ({
                id: b.id,
                amount: b.amount,
                timestamp: b.timestamp,
                status: b.status,
            })),
            finalChips: p.finalChips,
            clubId: activeClub.id,
        }
    });

    const newGame: GameHistory = {
        id: `game-import-${Date.now()}`,
        venue: importedGame.venue,
        timestamp: newGameDate.toISOString(),
        players: serializablePlayers as any, // Use `any` to bypass strict type checking
        startTime: newGameDate.toISOString(),
        endTime: new Date().toISOString(),
        clubId: activeClub.id,
        progressLog: [],
    };

    await saveGameHistory(newGame);
    await loadGameIntoState(newGame);

    setImportGameModalOpen(false);
};

  if (!isDataReady || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto" />
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
             <h1 className="text-2xl font-bold truncate">{greeting}</h1>
             <Badge variant="secondary">{activeClub?.name}</Badge>
           </div>
           <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-2">
            {activeGame && (
              <>
                <Badge variant="destructive" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {activeGame.players.length}
                </Badge>
                <EditableDate date={activeGame.timestamp} onDateChange={handleDateChange} isAdmin={isAdmin}/>
                {activeGame?.startTime && (
                    <div className="flex items-center gap-1">
                        <TimerIcon className="h-4 w-4" />
                        <span>{gameDuration}</span>
                    </div>
                )}
              </>
            )}
           </div>
        </div>
        
        <div className="flex items-center justify-start sm:justify-end gap-2 flex-wrap">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                </Link>
            </Button>
            {(isAdmin || isBanker) && (
                <>
                    <Button asChild variant="outline" size="icon">
                        <Link href="/expenses">
                            <Banknote className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button onClick={handleNewGame} variant="outline" size="icon">
                        <Plus className="h-4 w-4 text-green-500" />
                    </Button>
                </>
            )}
            <Button onClick={() => setLoadGameModalOpen(true)} variant="outline" size="icon">
                <History className="h-4 w-4 text-blue-500" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 <DropdownMenuItem asChild>
                   <Link href="/online-club">
                      <Landmark className="h-4 w-4 mr-2" />
                      Online Club
                   </Link>
                </DropdownMenuItem>
                 {(isAdmin) && (
                    <DropdownMenuItem asChild>
                        <Link href="/online-club/admin">
                            <Landmark className="h-4 w-4 mr-2" />
                            Online Club Admin
                        </Link>
                    </DropdownMenuItem>
                 )}
                {isAdmin && (
                    <>
                    <DropdownMenuItem asChild>
                       <Link href="/merge">
                          <Merge className="h-4 w-4 mr-2" />
                          Merge Players
                       </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                       <Link href="/merge-venues">
                          <MapIcon className="h-4 w-4 mr-2" />
                          Merge Venues
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/bookings/all">
                            <BookUser className="h-4 w-4 mr-2" />
                            Bookings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem asChild>
                   <Link href="/reports">
                      <History className="h-4 w-4 mr-2" />
                      Game History
                   </Link>
                </DropdownMenuItem>
                {isAdmin && (
                    <>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <MessageCircleCode className="h-4 w-4 mr-2" />
                        <Label htmlFor="otp-verification-toggle" className="pr-2 flex-1">OTP Verification</Label>
                        <Switch
                            id="otp-verification-toggle"
                            checked={isOtpVerificationEnabled}
                            onCheckedChange={setOtpVerificationEnabled}
                        />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setImportGameModalOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Game
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSendMessageModalOpen(true)}>
                        <WhatsappIcon />
                        <span className="ml-2">Group Message</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      
      <OnlineAccountsSummaryCard
        onlineClubs={onlineClubs}
        ledger={onlineLedger}
      />

        {activeGame ? (
            <AdminView
                activeGame={activeGame}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                updatePlayer={updatePlayer}
                removePlayer={removePlayer}
                isOtpVerificationEnabled={isOtpVerificationEnabled}
                whatsappConfig={whatsappConfig}
                canEdit={canEditGame}
                currentUser={currentUser}
                setAddPlayerModalOpen={setAddPlayerModalOpen}
                setSaveConfirmOpen={setSaveConfirmOpen}
                setEndGameConfirmOpen={setEndGameConfirmOpen}
                setReportsModalOpen={setReportsModalOpen}
                setSendBuyInSummaryOpen={setSendBuyInSummaryOpen}
                toast={toast}
            />
        ) : !isAdmin && hasCheckedForGame ? (
            <BookingView 
                currentUser={currentUser}
                activeClub={activeClub}
                toast={toast}
                onStartGame={handleStartGame}
            />
        ) : ((isAdmin) && !activeGame && isDataReady && (
            <BookingView 
                currentUser={currentUser}
                activeClub={activeClub}
                toast={toast}
                onStartGame={handleStartGame}
            />
        ))}

      <GameCreationDialog
        isOpen={isGameCreationModalOpen}
        onOpenChange={setGameCreationModalOpen}
        masterVenues={isSuperAdmin ? allVenues : masterVenues}
        onStartGame={handleStartGame}
        toast={toast}
        activeClub={activeClub}
        masterPlayers={isSuperAdmin ? allPlayers : masterPlayers}
        allClubs={allClubs}
        isSuperAdmin={isSuperAdmin}
      />
       <AddPlayerDialog
        isOpen={isAddPlayerModalOpen}
        onOpenChange={setAddPlayerModalOpen}
        masterPlayers={masterPlayers}
        gamePlayers={activeGame?.players || []}
        onAddPlayers={addPlayers}
        toast={toast}
      />
      <LoadGameDialog 
        isOpen={isLoadGameModalOpen}
        onOpenChange={setLoadGameModalOpen}
        gameHistory={gameHistory}
        onLoadGame={handleLoadGame}
        onJoinGame={handleJoinGame}
        onDeleteGame={handleDeleteGame}
        onNewGame={handleNewGame}
        whatsappConfig={whatsappConfig}
        toast={toast}
        currentUser={currentUser}
      />
      <ReportsDialog 
        isOpen={isReportsModalOpen}
        onOpenChange={setReportsModalOpen}
        activeGame={activeGame}
        onSettleUp={() => {
          setReportsModalOpen(false);
          setSettlementModalOpen(true);
        }}
      />
      <SendMessageDialog
        isOpen={isSendMessageModalOpen}
        onOpenChange={setSendMessageModalOpen}
        whatsappConfig={whatsappConfig}
        masterPlayers={masterPlayers}
        toast={toast}
      />
      <ImportGameDialog
        isOpen={isImportGameModalOpen}
        onOpenChange={setImportGameModalOpen}
        onImport={handleImportedGame}
        toast={toast}
      />
      <SaveConfirmDialog
        isOpen={isSaveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        activeGame={activeGame}
        onConfirmSave={handleSaveGameProgress}
        title="Confirm Game Progress"
        description="Review and edit chip counts before saving the current progress. This will not end the game."
        buttonText="Confirm &amp; Save Progress"
      />
       <SaveConfirmDialog
        isOpen={isEndGameConfirmOpen}
        onOpenChange={setEndGameConfirmOpen}
        activeGame={activeGame}
        onConfirmSave={handleEndGame}
        title="Confirm End Game"
        description="Review and edit final chip counts before ending the game session. This action will stop the timer and save the final results."
        buttonText="Confirm &amp; End Game"
        isEndGame={true}
      />
      <SettlementDialog
        isOpen={isSettlementModalOpen}
        onOpenChange={setSettlementModalOpen}
        activeGame={activeGame}
        whatsappConfig={whatsappConfig}
        toast={toast}
        masterPlayers={masterPlayers}
      />
      <BuyInSummaryDialog
        isOpen={isSendBuyInSummaryOpen}
        onOpenChange={setSendBuyInSummaryOpen}
        activeGame={activeGame}
        whatsappConfig={whatsappConfig}
        toast={toast}
        masterPlayers={masterPlayers}
      />
      <BuyInRequestModalDialog
        request={buyInRequestModal}
        onOpenChange={() => setBuyInRequestModal(null)}
        onApprove={(playerId, buyInId) => {
          if (!activeGame) return;
          const player = activeGame.players.find(p => p.id === playerId);
          if (!player) return;
          const buyIn = player.buyIns.find(b => b.id === buyInId);
          if (!buyIn) return;
          
          const buyInRow = document.querySelector(`[data-buyin-id="${buyInId}"]`);
          const approveButton = buyInRow?.querySelector('button');
          approveButton?.click();
          setBuyInRequestModal(null);
        }}
      />
      <DeckChangeAlertDialog
        isOpen={showDeckChangeAlert}
        onOpenChange={setShowDeckChangeAlert}
      />
      <OtpVerificationDialog
        isOpen={isOtpModalOpen}
        onOpenChange={setOtpModalOpen}
        currentValue={isOtpVerificationEnabled}
        onSave={(value) => {
            setOtpVerificationEnabled(value);
            setOtpModalOpen(false);
        }}
        onCancel={() => {
            setOtpModalOpen(false);
        }}
      />
    </div>
  )
}
    
    

const OtpVerificationDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentValue: boolean;
    onSave: (value: boolean) => void;
    onCancel: () => void;
}> = ({ isOpen, onOpenChange, currentValue, onSave, onCancel }) => {
    const [isEnabled, setIsEnabled] = useState(currentValue);

    useEffect(() => {
        setIsEnabled(currentValue);
    }, [currentValue, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-6 w-6 text-primary" />
                        Buy-in OTP Verification
                    </DialogTitle>
                    <DialogDescription>
                        Would you like to enable WhatsApp OTP verification for all buy-in requests during this session?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="flex items-center space-x-2">
                        <Switch id="otp-toggle" checked={isEnabled} onCheckedChange={setIsEnabled} />
                        <Label htmlFor="otp-toggle">{isEnabled ? "Enabled" : "Disabled"}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        {isEnabled
                            ? "Admins will need to approve buy-ins and players will verify with an OTP."
                            : "All buy-ins will be automatically verified without an OTP. This is faster but less secure."}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Skip</Button>
                    <Button onClick={() => onSave(isEnabled)}>Save Preference</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

const BuyInRequestPopover: FC<{
    onBuyInRequest: (amount: number) => void;
    isOtpEnabled: boolean;
}> = ({ onBuyInRequest, isOtpEnabled }) => {
    const [amount, setAmount] = useState<number | string>("");

    const button = (
        <Button disabled={!isOtpEnabled}>
            <Plus className="mr-2" />Request Buy-in
        </Button>
    );

    return (
        <Popover>
            <PopoverTrigger asChild>
                {isOtpEnabled ? (
                    button
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={0}>{button}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>Buy-in requests are disabled when OTP verification is off.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-auto">
                <div className="space-y-2">
                    <Label htmlFor="buyin-request-amount">Amount</Label>
                    <Input id="buyin-request-amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="e.g. 500" />
                    <Button
                        onClick={() => {
                            if (Number(amount) > 0) {
                                onBuyInRequest(Number(amount));
                                setAmount("");
                                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                            }
                        }}
                        disabled={!amount || Number(amount) <= 0}
                        className="w-full"
                    >
                        Submit Request
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

const AddDirectBuyInPopover: FC<{
    onAddDirectBuyIn: (amount: number) => void;
}> = ({ onAddDirectBuyIn }) => {
    const [amount, setAmount] = useState<number | string>("");
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="secondary"><Plus className="mr-2" />Add Direct Buy-in</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
                <div className="space-y-2">
                    <Label htmlFor="direct-buyin-amount">Amount</Label>
                    <Input id="direct-buyin-amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="e.g. 500" />
                    <Button
                        onClick={() => {
                            if (Number(amount) > 0) {
                                onAddDirectBuyIn(Number(amount));
                                setAmount("");
                                // Trigger popover close
                                document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                            }
                        }}
                        disabled={!amount || Number(amount) <= 0}
                        className="w-full"
                    >
                        Add &amp; Verify
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}


const BuyInRow: FC<{
    buyIn: BuyIn;
    player: Player;
    onUpdateBuyIn: (buyInId: string, newValues: Partial<BuyIn>) => void;
    onRemoveBuyIn: (buyInId: string) => void;
    isOtpEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    canEdit: boolean;
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ buyIn, player, onUpdateBuyIn, onRemoveBuyIn, isOtpEnabled, whatsappConfig, canEdit, toast }) => {
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    
    useEffect(() => {
        // Automatically verify if OTP is globally disabled
        if (!isOtpEnabled && buyIn.status !== 'verified') {
            onUpdateBuyIn(buyIn.id, { status: 'verified' });
        }
    }, [isOtpEnabled, buyIn.status, buyIn.id, onUpdateBuyIn]);

    const handleSendOtp = async () => {
        if (!player.whatsappNumber) {
            toast({ variant: "destructive", title: "Missing Number", description: "Player's WhatsApp number is required to send OTP." });
            return;
        }

        setIsSending(true);
        try {
            const verifiedBuyIns = (player.buyIns || []).filter(b => b.status === 'verified');
            const totalVerifiedAmount = verifiedBuyIns.reduce((sum, b) => sum + b.amount, 0);

            const result = await sendBuyInOtp({
                playerName: player.name,
                whatsappNumber: player.whatsappNumber,
                buyInAmount: buyIn.amount,
                buyInCount: verifiedBuyIns.length + 1,
                totalBuyInAmount: totalVerifiedAmount,
                whatsappConfig,
            });

            if (result.success && result.otp) {
                toast({ title: "OTP Sent", description: "Verification code sent to player's WhatsApp." });
                setSentOtp(result.otp);
                onUpdateBuyIn(buyIn.id, { status: 'approved' });
            } else {
                throw new Error(result.error || "Failed to send OTP.");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "OTP Error", description: e.message });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleConfirmOtp = () => {
        setIsVerifying(true);
        if (otp === sentOtp) {
            toast({ title: "Success", description: "Buy-in verified successfully." });
            onUpdateBuyIn(buyIn.id, { status: 'verified' });
        } else {
            toast({ variant: "destructive", title: "Invalid OTP", description: "The entered code is incorrect." });
        }
        setIsVerifying(false);
    };

    const getStatusIndicator = () => {
        switch (buyIn.status) {
            case 'requested':
                return <TooltipProvider><Tooltip><TooltipTrigger asChild><button><Hourglass className="h-5 w-5 text-amber-500" /></button></TooltipTrigger><TooltipContent><p>Requested</p></TooltipContent></Tooltip></TooltipProvider>
            case 'approved':
                return <TooltipProvider><Tooltip><TooltipTrigger asChild><button><Send className="h-5 w-5 text-sky-500" /></button></TooltipTrigger><TooltipContent><p>OTP Sent</p></TooltipContent></Tooltip></TooltipProvider>
            case 'verified':
                return <TooltipProvider><Tooltip><TooltipTrigger asChild><button><CheckCircle2 className="h-5 w-5 text-green-600" /></button></TooltipTrigger><TooltipContent><p>Verified</p></TooltipContent></Tooltip></TooltipProvider>
            default:
                return null;
        }
    }

    return (
        <div className="p-2 rounded-md border bg-slate-100 dark:bg-slate-800 space-y-2" data-buyin-id={buyIn.id}>
            <div className="flex items-center gap-2">
                <div className="flex-1 font-medium text-lg">₹{buyIn.amount}</div>
                {getStatusIndicator()}
                 {canEdit && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this buy-in of ₹{buyIn.amount} for {player.name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRemoveBuyIn(buyIn.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            
            {canEdit && isOtpEnabled && buyIn.status === 'requested' && (
                <Button onClick={handleSendOtp} disabled={isSending} className="w-full h-9">
                    {isSending ? <Loader2 className="animate-spin" /> : <>Approve &amp; Send OTP</>}
                </Button>
            )}

             {canEdit && isOtpEnabled && buyIn.status === 'approved' && (
                <div className="flex items-center gap-2">
                    <Input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="4-Digit OTP" className="h-9"/>
                    <Button onClick={handleConfirmOtp} disabled={isVerifying} className="h-9">
                        {isVerifying ? <Loader2 className="animate-spin" /> : "Confirm"}
                    </Button>
                </div>
            )}
        </div>
    )
}

const PlayerCard: FC<{
  player: Player;
  onUpdate: (id: string, newValues: Partial<Player>) => void;
  onRemove: (id: string) => void;
  isOtpEnabled: boolean;
  whatsappConfig: WhatsappConfig;
  canEdit: boolean;
  currentUser: MasterPlayer | null;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string; }) => void;
  activeGame: GameHistory;
}> = ({ player, onUpdate, onRemove, isOtpEnabled, whatsappConfig, canEdit, currentUser, toast, activeGame }) => {
  const isCurrentUser = player.name === currentUser?.name;

  const [finalChips, setFinalChips] = useState(player.finalChips);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setFinalChips(player.finalChips);
  }, [player.finalChips]);

  const handleFinalChipsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFinalChips(value);

    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
        onUpdate(player.id, { finalChips: value });
    }, 500); // 500ms debounce delay
  };

  const handleFinalChipsBlur = () => {
      if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
      }
      if (finalChips !== player.finalChips) {
          onUpdate(player.id, { finalChips });
      }
  };

  const handleUpdateBuyIn = (buyInId: string, newValues: Partial<BuyIn>) => {
    const newBuyIns = (player.buyIns || []).map(b => 
        b.id === buyInId ? { ...b, ...newValues } : b
    );
    onUpdate(player.id, { buyIns: newBuyIns });
  }

  const handleBuyInRequest = (amount: number) => {
    const newBuyIn: BuyIn = {
        id: `buyin-${Date.now()}-${Math.random()}`,
        amount, 
        timestamp: new Date().toISOString(), 
        status: isOtpEnabled ? 'requested' : 'verified'
    }
    const newBuyIns = [...(player.buyIns || []), newBuyIn];
    onUpdate(player.id, { buyIns: newBuyIns });
    toast({ title: "Request Sent", description: `Your request for ₹${amount} has been sent to the admin.`})
  }
  
  const handleAddDirectBuyIn = (amount: number) => {
    const newBuyIn: BuyIn = {
        id: `buyin-${Date.now()}-${Math.random()}`,
        amount, 
        timestamp: new Date().toISOString(), 
        status: 'verified'
    }
    const newBuyIns = [...(player.buyIns || []), newBuyIn];
    onUpdate(player.id, { buyIns: newBuyIns });
    toast({ title: "Buy-in Added", description: `A direct buy-in of ₹${amount} has been added for ${player.name}.`})
  }

  const removeBuyIn = (buyInId: string) => {
    const newBuyIns = (player.buyIns || []).filter(b => b.id !== buyInId);
    onUpdate(player.id, { buyIns: newBuyIns });
  }

  const totalBuyIns = useMemo(() => {
    return (player.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
  }, [player.buyIns]);
  
  const totalBuyInCount = useMemo(() => {
    return (player.buyIns || []).length;
  }, [player.buyIns]);

  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                 <div className="flex items-center justify-between mb-2">
                    <Label className="text-lg">Buy-ins</Label>
                    <Badge variant="default" className="text-base font-semibold px-3 py-1.5">Total: ₹{totalBuyIns}</Badge>
                </div>
                <Accordion type="single" collapsible className="w-full" defaultValue={totalBuyInCount > 4 ? "" : "item-1"}>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="text-sm font-medium">
                          Show <span className="font-bold">{totalBuyInCount}</span> Buy-in(s)
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                           {(player.buyIns || []).map((buyIn) => (
                              <div key={buyIn.id}>
                                <BuyInRow 
                                    buyIn={buyIn}
                                    player={player}
                                    onUpdateBuyIn={handleUpdateBuyIn}
                                    onRemoveBuyIn={removeBuyIn}
                                    isOtpEnabled={isOtpEnabled}
                                    whatsappConfig={whatsappConfig}
                                    canEdit={canEdit}
                                    toast={toast}
                                />
                              </div>
                            ))}
                            {totalBuyInCount === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-4">No buy-ins for this player yet.</p>
                            )}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="mt-4 flex items-center justify-end">
                    <div className="flex gap-2">
                        {isCurrentUser && !canEdit ? (
                            <BuyInRequestPopover onBuyInRequest={handleBuyInRequest} isOtpEnabled={isOtpEnabled} />
                        ) : canEdit ? (
                            <AddDirectBuyInPopover onAddDirectBuyIn={handleAddDirectBuyIn} />
                        ): null}
                    </div>
                </div>
            </div>
            <div>
            <Label className="text-lg">Final Chips</Label>
            <Input 
                type="number" 
                className="mt-2 h-9" 
                value={finalChips === 0 ? "" : finalChips}
                onChange={handleFinalChipsChange}
                onBlur={handleFinalChipsBlur}
                placeholder="Chip Count"
                disabled={!canEdit}
            />
            </div>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-end items-center mt-4">
            <div className="flex gap-2 items-center">
                {canEdit && (
                    <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" disabled={!canEdit}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove Player</span>
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to remove {player.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently remove the player and all their data from this game.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onRemove(player.id)}>Remove Player</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>
        </div>
        
    </div>
  )
}

const GameCreationDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    masterVenues: MasterVenue[];
    onStartGame: (venue: string, date: Date, time: string, seats: number, preBookedPlayerIds: string[], clubId: string) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
    activeClub: Club | null;
    masterPlayers: MasterPlayer[];
    allClubs: Club[];
    isSuperAdmin: boolean;
}> = ({ isOpen, onOpenChange, masterVenues, onStartGame, toast, activeClub, masterPlayers, allClubs, isSuperAdmin }) => {
    const [venue, setVenue] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('13:30');
    const [seats, setSeats] = useState(10);
    const [preBookedPlayerIds, setPreBookedPlayerIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState<string>('');

    const sortedVenues = useMemo(() => {
        const venuesToShow = isSuperAdmin ? masterVenues.filter(v => v.clubId === selectedClubId) : masterVenues;
        return [...venuesToShow].sort((a,b) => a.name.localeCompare(b.name));
    }, [masterVenues, isSuperAdmin, selectedClubId]);

    const clubPlayers = useMemo(() => {
        const playersToShow = isSuperAdmin ? masterPlayers.filter(p => p.clubId === selectedClubId) : masterPlayers;
        return playersToShow.filter(p => p.isActive !== false)
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [masterPlayers, isSuperAdmin, selectedClubId]);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            setDate(now);
            setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
            setSeats(10);
            setVenue("");
            setPreBookedPlayerIds([]);
            setSelectedClubId(activeClub?.id || '');
        }
    }, [isOpen, activeClub]);

    const handleStart = async () => {
        if (!venue.trim()) {
            toast({ variant: "destructive", title: "Venue Required", description: "Please enter or select a venue name." });
            return;
        }
        if (!date) {
            toast({ variant: "destructive", title: "Date Required", description: "Please select a game date." });
            return;
        }
        const clubIdForGame = isSuperAdmin ? selectedClubId : activeClub?.id;
        if (!clubIdForGame) {
            toast({ variant: "destructive", title: "Club Required", description: "A club must be selected." });
            return;
        }

        setIsSaving(true);
        await onStartGame(venue.trim(), date, time, seats, preBookedPlayerIds, clubIdForGame);
        setIsSaving(false);
        onOpenChange(false);
    };
    
    const handlePlayerSelect = (playerId: string, isSelected: boolean) => {
        setPreBookedPlayerIds(prev => isSelected ? [...prev, playerId] : prev.filter(id => id !== playerId));
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Start or Schedule Game</DialogTitle>
                    <DialogDescription>Enter game details. You can start a game now or schedule one for the future.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] py-4 pr-4">
                    <div className="space-y-4">
                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="club-select">Club</Label>
                                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                                    <SelectTrigger id="club-select">
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
                        <div className="space-y-2">
                            <Label htmlFor="venue-name">Venue Name</Label>
                            <Input id="venue-name" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., The Poker Den" />
                        </div>
                        {sortedVenues.length > 0 && (
                            <div className="space-y-2">
                                <Label>Or Select Existing</Label>
                                <Select onValueChange={setVenue}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a venue..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedVenues.map(v => (
                                            <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="game-date">Game Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start-time">Start Time</Label>
                                <Input id="start-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="seats">Total Seats</Label>
                            <Input id="seats" type="number" value={seats} onChange={(e) => setSeats(Number(e.target.value))} min="1" />
                        </div>
                         <div className="space-y-2">
                             <Label>Pre-book Players (Optional)</Label>
                             <p className="text-sm text-muted-foreground">Select players to automatically add them to the game.</p>
                             <ScrollArea className="h-48 border rounded-md p-2">
                                {clubPlayers.map(player => (
                                    <div key={player.id} className="flex items-center space-x-3 p-1">
                                        <Checkbox
                                            id={`player-book-${player.id}`}
                                            checked={preBookedPlayerIds.includes(player.id)}
                                            onCheckedChange={checked => handlePlayerSelect(player.id, !!checked)}
                                        />
                                        <Label htmlFor={`player-book-${player.id}`}>{player.name}</Label>
                                    </div>
                                ))}
                                {isSuperAdmin && !selectedClubId && (
                                     <p className="text-center text-muted-foreground p-4">Please select a club to see players.</p>
                                )}
                             </ScrollArea>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleStart} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Start Game'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AddPlayerDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  masterPlayers: MasterPlayer[];
  gamePlayers: Player[];
  onAddPlayers: (players: MasterPlayer[]) => void;
  toast: ReturnType<typeof useToast>['toast'];
}> = ({ isOpen, onOpenChange, masterPlayers, gamePlayers, onAddPlayers, toast }) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const gamePlayerNames = useMemo(() => gamePlayers.map(p => p.name), [gamePlayers]);

  const availablePlayers = useMemo(() => {
    return masterPlayers
      .filter(mp => !gamePlayerNames.includes(mp.name) && (mp.isActive ?? true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterPlayers, gamePlayerNames]);

  useEffect(() => {
    // Reset selection when dialog opens
    if (isOpen) {
      setSelectedPlayerIds([]);
    }
  }, [isOpen]);

  const handleSelectPlayer = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayerIds(prev => [...prev, id]);
    } else {
      setSelectedPlayerIds(prev => prev.filter(pId => pId !== id));
    }
  };

  const handleAdd = () => {
    const playersToAdd = masterPlayers.filter(p => selectedPlayerIds.includes(p.id));
    if (playersToAdd.length === 0) {
        toast({ variant: 'destructive', title: 'No players selected', description: 'Please select one or more players to add to the game.'})
        return;
    }
    onAddPlayers(playersToAdd);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Players to Game</DialogTitle>
          <DialogDescription>
            Select players from your master list to add to the current game.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-72 border rounded-md p-2">
            <div className="space-y-1">
              {availablePlayers.map(player => (
                <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`add-${player.id}`}
                    checked={selectedPlayerIds.includes(player.id)}
                    onCheckedChange={checked => handleSelectPlayer(player.id, !!checked)}
                  />
                  <Label htmlFor={`add-${player.id}`} className="flex-1 cursor-pointer">
                    {player.name}
                  </Label>
                </div>
              ))}
            </div>
             {availablePlayers.length === 0 && <p className="text-center text-muted-foreground p-4">All active players have been added.</p>}
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAdd}>Add {selectedPlayerIds.length > 0 ? `(${selectedPlayerIds.length})` : ''} Player(s)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LoadGameDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameHistory: GameHistory[];
  onLoadGame: (gameId: string) => void;
  onJoinGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onNewGame: () => void;
  whatsappConfig: WhatsappConfig;
  toast: ReturnType<typeof useToast>['toast'];
  currentUser: MasterPlayer | null;
}> = ({ isOpen, onOpenChange, gameHistory, onLoadGame, onJoinGame, onDeleteGame, onNewGame, whatsappConfig, toast, currentUser }) => {
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [gameToDelete, setGameToDelete] = useState<GameHistory | null>(null);
    
    const sortedGameHistory = useMemo(() => {
        return [...gameHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [gameHistory]);

    const handleDeleteRequest = async (game: GameHistory) => {
        setGameToDelete(game);
        setIsSendingOtp(true);
        try {
            const result = await sendDeleteGameOtp({ 
                gameVenue: game.venue,
                gameDate: format(new Date(game.timestamp), 'PPP'),
                whatsappConfig
            });
            if (result.success && result.otp) {
                setSentOtp(result.otp);
                toast({ title: "OTP Sent", description: `An OTP has been sent to the super admin for verification.` });
            } else {
                throw new Error(result.error || "Failed to send OTP.");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "OTP Error", description: e.message });
            setGameToDelete(null);
        } finally {
            setIsSendingOtp(false);
        }
    };
    
    const confirmDelete = () => {
        if (!gameToDelete || otp !== sentOtp) {
            toast({ variant: "destructive", title: "Invalid OTP", description: "The entered OTP is incorrect." });
            return;
        }
        onDeleteGame(gameToDelete.id);
        setGameToDelete(null);
        setOtp("");
        setSentOtp("");
    };

    const handleGameAction = (game: GameHistory) => {
        onOpenChange(false);
        const isFinished = !!game.endTime;
        if (isFinished) {
            onLoadGame(game.id);
        } else {
            onJoinGame(game.id);
        }
    };

    if (gameToDelete) {
        return (
            <Dialog open={!!gameToDelete} onOpenChange={() => setGameToDelete(null)}>
                 <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Confirm Deletion of Game</DialogTitle>
                          <DialogDescription>Enter the OTP sent to the Super Admin's WhatsApp to confirm deleting the game at {gameToDelete.venue} on {format(new Date(gameToDelete.timestamp), 'PP')}.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-2">
                          <Label htmlFor="delete-game-otp">Admin OTP</Label>
                          <Input id="delete-game-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="4-digit OTP" />
                      </div>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setGameToDelete(null)}>Cancel</Button>
                          <Button variant="destructive" onClick={confirmDelete}>
                              Confirm &amp; Delete
                          </Button>
                      </DialogFooter>
                  </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Join or View Game</DialogTitle>
                    <DialogDescription>Select a past game to review, or an active game to join.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-2">
                        {sortedGameHistory.length > 0 ? (
                            sortedGameHistory.map(game => {
                                const isFinished = !!game.endTime;
                                const buttonText = isFinished ? "View" : "Join";

                                return (
                                <Card key={game.id} className="hover:border-primary">
                                    <CardContent className="p-4 flex justify-between items-center">
                                       <div className="flex-1 cursor-pointer" onClick={() => handleGameAction(game)}>
                                            <p className="font-bold">{game.venue}</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(game.timestamp), 'dd MMMM yyyy, p')}</p>
                                            <Badge variant={isFinished ? 'secondary' : 'destructive'} className="mt-2">{isFinished ? 'Finished' : 'In Progress'}</Badge>
                                       </div>
                                       <div className="flex gap-2 items-center">
                                            <Button size="sm" onClick={() => handleGameAction(game)}>{buttonText}</Button>
                                            {currentUser?.isAdmin && (
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteRequest(game)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                       </div>
                                    </CardContent>
                                </Card>
                            )})
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No game history found for this club.</p>
                                {(currentUser?.isAdmin) && <Button variant="link" onClick={() => {onOpenChange(false); onNewGame();}}>Start a New Game</Button>}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

const PlayerBuyInSummaryTable: FC<{ calculatedPlayers: CalculatedPlayer[] }> = ({ calculatedPlayers }) => {
    if (!calculatedPlayers || calculatedPlayers.length === 0) {
        return <p className="text-center text-muted-foreground">No player data to display.</p>;
    }

    const sortedData = [...calculatedPlayers].sort((a, b) => a.name.localeCompare(b.name));
    const maxBuyIns = Math.max(0, ...sortedData.map(p => p.buyIns?.length || 0));
    const buyInRows = Array.from({ length: maxBuyIns }, (_, i) => i);

    return (
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        {sortedData.map(player => (
                            <TableHead key={player.id} className="text-right">{player.name}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {buyInRows.map(rowIndex => (
                        <TableRow key={`buyin-row-${rowIndex}`}>
                            <TableCell className="text-left font-semibold">Buy-in {rowIndex + 1}</TableCell>
                            {sortedData.map(player => (
                                <TableCell key={`${player.id}-buyin-${rowIndex}`} className="text-right font-mono">
                                    {player.buyIns && player.buyIns[rowIndex] ? `₹${player.buyIns[rowIndex].amount.toFixed(0)}` : '-'}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
                <TableFoot>
                     <TableRow>
                       <TableCell className="text-left font-semibold text-base">Summary</TableCell>
                       <TableCell colSpan={sortedData.length}></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="text-left font-semibold">No. of buy-ins</TableCell>
                        {sortedData.map(player => (
                            <TableCell key={`${player.id}-count`} className="text-right font-semibold">{player.buyIns?.length || 0}</TableCell>
                        ))}
                    </TableRow>
                    <TableRow className="font-bold">
                        <TableCell className="text-left font-semibold">Total Amount</TableCell>
                        {sortedData.map(player => (
                            <TableCell key={`${player.id}-total`} className="text-right font-mono">₹{player.totalBuyIns.toFixed(0)}</TableCell>
                        ))}
                    </TableRow>
                </TableFoot>
            </Table>
        </div>
    );
};


const ReportsDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    onSettleUp: () => void,
}> = ({ isOpen, onOpenChange, activeGame, onSettleUp }) => {
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const calculatedPlayers = useMemo((): CalculatedPlayer[] => {
        if (!activeGame || !activeGame.players) return [];
        return activeGame.players.map(p => {
            const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
            return {
                ...p,
                totalBuyIns,
                profitLoss: p.finalChips - totalBuyIns,
            }
        });
    }, [activeGame]);

    const sortedStandings = useMemo(() => {
        if (!calculatedPlayers) return [];
        return [...calculatedPlayers].sort((a, b) => b.profitLoss - a.profitLoss);
    }, [calculatedPlayers]);
    
    const transfers = useMemo(() => {
      if (!calculatedPlayers) return [];
      return calculateInterPlayerTransfers(calculatedPlayers);
    }, [calculatedPlayers]);
    
    const { grandTotalBuyin, grandTotalChips, grandTotalProfitLoss } = useMemo(() => {
        if (!calculatedPlayers) return { grandTotalBuyin: 0, grandTotalChips: 0, grandTotalProfitLoss: 0 };
        return {
            grandTotalBuyin: calculatedPlayers.reduce((sum, p) => sum + p.totalBuyIns, 0),
            grandTotalChips: calculatedPlayers.reduce((sum, p) => sum + p.finalChips, 0),
            grandTotalProfitLoss: calculatedPlayers.reduce((sum, p) => sum + p.profitLoss, 0)
        };
    }, [calculatedPlayers]);
      
    const pieChartData = useMemo(() => {
        if (!activeGame) return [];
        return (activeGame.players || [])
          .filter(p => p.finalChips > 0)
          .map(p => ({ name: p.name, value: p.finalChips }));
    }, [activeGame]);

    const accountingSummary = useMemo(() => {
        if (!activeGame) return null;
        const totalEntryFees = (activeGame.players.length || 0) * (activeGame.playerEntryFee || 0);
        const totalExpenses = (activeGame.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalEntryFees - totalExpenses;
        return { totalEntryFees, totalExpenses, cashInHand: netProfit };
    }, [activeGame]);


    const handleExportPdf = async () => {
        const reportElement = reportContentRef.current;
        if (!activeGame || !reportElement) {
            toast({ variant: "destructive", title: "Export Error", description: "Report content is not available to export." });
            return;
        }

        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2, // Higher scale for better quality before compression
                useCORS: true,
                backgroundColor: null, // Use transparent background for dark mode compatibility
            });
            
            // Compress the image by using JPEG format with a quality setting
            const imgData = canvas.toDataURL('image/jpeg', 0.7); // Quality 0.7 for good compression
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            
            const venueName = activeGame.venue.replace(/\s/g, '_');
            const gameDate = format(new Date(activeGame.timestamp), "yyyy-MM-dd");
            const filename = `${venueName}_${gameDate}_Report.pdf`;

            pdf.save(filename);
            toast({ title: "Success", description: "Report has been exported as a PDF." });
        } catch (error) {
            console.error("Could not export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "An error occurred while generating the PDF." });
        } finally {
            setIsExporting(false);
        }
    };

    if (!activeGame) {
        return null;
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-full h-full sm:h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl md:text-2xl lg:text-3xl">Game Report: {activeGame.venue}</DialogTitle>
                            <DialogDescription className="text-sm md:text-base">{format(new Date(activeGame.timestamp), "dd MMMM yyyy")}</DialogDescription>
                            {activeGame.startTime && (
                                <p className="text-xs md:text-sm text-muted-foreground">
                                    Started: {format(new Date(activeGame.startTime), 'p')}
                                    {activeGame.endTime && ` - Ended: ${format(new Date(activeGame.endTime), 'p')}`}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button onClick={handleExportPdf} disabled={isExporting} size="sm">
                                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Export PDF
                            </Button>
                            <Button onClick={onSettleUp} size="sm">
                                <WhatsappIcon />
                                <span className="ml-2">Settlement</span>
                            </Button>
                            <DialogClose asChild>
                            <Button variant="outline" size="icon"><X /></Button>
                            </DialogClose>
                        </div>
                    </div>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6">
                    <div ref={reportContentRef} className="px-2 sm:px-4 md:px-6 py-4 bg-background space-y-6">
                        {accountingSummary && (activeGame.playerEntryFee || 0) > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Accounting Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Total Entry Fees Collected</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">+ ₹{accountingSummary.totalEntryFees.toFixed(2)}</TableCell>
                                            </TableRow>
                                            {(activeGame.expenses || []).map((exp, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="pl-8">{exp.name}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">- ₹{exp.amount.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                             <TableRow>
                                                <TableCell>Total Expenses</TableCell>
                                                <TableCell className="text-right font-mono text-red-600">- ₹{accountingSummary.totalExpenses.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                        <TableFoot>
                                            <TableRow className="font-bold text-lg">
                                                <TableCell>Cash in Hand</TableCell>
                                                <TableCell className={cn("text-right font-mono", accountingSummary.cashInHand >= 0 ? "text-green-600" : "text-red-600")}>
                                                    ₹{accountingSummary.cashInHand.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        </TableFoot>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                        
                        <div className="overflow-x-auto">
                          <Card>
                              <CardHeader><CardTitle>Player Summary</CardTitle></CardHeader>
                              <CardContent>
                                  <div className="w-full overflow-x-auto">
                                      <Table className="text-xs sm:text-sm">
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead className="px-2 sm:px-4 text-left">Player</TableHead>
                                                  <TableHead className="px-2 sm:px-4 text-right">Buy-in</TableHead>
                                                  <TableHead className="px-2 sm:px-4 text-right">Return</TableHead>
                                                  <TableHead className="px-2 sm:px-4 text-right">P/L</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {sortedStandings.map((p) => (
                                                  <TableRow key={p.id}>
                                                      <TableCell className="font-medium px-2 sm:px-4 text-left whitespace-nowrap">{p.name}</TableCell>
                                                      <TableCell className="px-2 sm:px-4 text-right">₹{p.totalBuyIns}</TableCell>
                                                      <TableCell className="px-2 sm:px-4 text-right">₹{p.finalChips}</TableCell>
                                                      <TableCell className={`px-2 sm:px-4 text-right font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{p.profitLoss.toFixed(0)}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                          <TableFoot>
                                              <TableRow className="font-bold border-t-2 border-foreground">
                                                  <TableCell className="px-2 sm:px-4 text-left">Accumulative Report</TableCell>
                                                  <TableCell className="px-2 sm:px-4 text-right">₹{grandTotalBuyin}</TableCell>
                                                  <TableCell className="px-2 sm:px-4 text-right">₹{grandTotalChips}</TableCell>
                                                  <TableCell className={`px-2 sm:px-4 text-right ${grandTotalProfitLoss === 0 ? '' : 'text-destructive'}`}>₹{grandTotalProfitLoss.toFixed(0)}</TableCell>
                                              </TableRow>
                                          </TableFoot>
                                      </Table>
                                  </div>
                              </CardContent>
                          </Card>
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Player Settlement Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {transfers.length > 0 ? (
                                    <ul className="space-y-2 text-sm sm:text-base">
                                        {transfers.map((t, i) => (
                                            <li key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted" dangerouslySetInnerHTML={{ __html: t.replace(/<strong>(.*?)<\/strong>/g, '<strong class="font-bold text-primary">$1</strong>') }} />
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground">No transfers needed. The game is balanced.</p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             {/* Player Performance */}
                             <Card>
                                <CardHeader><CardTitle className="text-base sm:text-xl">Player Performance</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {sortedStandings.map(p => {
                                        const progressValue = p.totalBuyIns > 0 ? ((p.profitLoss + p.totalBuyIns) / p.totalBuyIns) * 100 : 0;
                                        return (
                                            <div key={p.id}>
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-medium text-xs sm:text-sm">{p.name}</span>
                                                    <span className={`font-semibold text-xs sm:text-sm ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        P/L: ₹{p.profitLoss.toFixed(0)}
                                                    </span>
                                                </div>
                                                <TooltipProvider>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Progress 
                                                        value={progressValue}
                                                        className={cn("h-3 sm:h-4", p.profitLoss < 0 && "[&>div]:bg-destructive")}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Buy-in: ₹{p.totalBuyIns}</p>
                                                    <p>Return: ₹{p.finalChips}</p>
                                                </TooltipContent>
                                                </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>

                             {/* Final Chip Distribution */}
                            <Card>
                                <CardHeader><CardTitle className="text-base sm:text-xl">Final Chip Distribution</CardTitle></CardHeader>
                                <CardContent>
                                    <div id="chart-container-for-pdf" className="h-[250px] sm:h-[300px]">
                                        <ChipDistributionChart data={pieChartData} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="overflow-x-auto">
                            <Card>
                                <CardHeader><CardTitle>Player Buy-in Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="w-full overflow-x-auto">
                                        <PlayerBuyInSummaryTable calculatedPlayers={calculatedPlayers} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                         {/* Player Timeline Analysis */}
                        {activeGame.progressLog && activeGame.progressLog.length > 0 && (
                            <PlayerTimelineAnalysis
                                game={activeGame}
                                calculatedPlayers={calculatedPlayers}
                                activeTab=""
                            />
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

const SettlementDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    whatsappConfig: WhatsappConfig,
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void,
    masterPlayers: MasterPlayer[],
}> = ({ isOpen, onOpenChange, activeGame, whatsappConfig, toast, masterPlayers }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isGroupSending, setIsGroupSending] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [includeSummary, setIncludeSummary] = useState(false);
    const [includeTimeline, setIncludeTimeline] = useState(false);
    const [previewMessage, setPreviewMessage] = useState('');
    
    const allPlayersInGame = useMemo(() => {
        if (!activeGame) return [];
        return activeGame.players.map(p => {
            const masterPlayer = masterPlayers.find(mp => mp.name === p.name);
            return {
                ...p,
                whatsappNumber: masterPlayer?.whatsappNumber || p.whatsappNumber,
            }
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeGame, masterPlayers]);
    
    const calculatedPlayers = useMemo((): CalculatedPlayer[] => {
        if (!activeGame || !activeGame.players) return [];
        return activeGame.players.map(p => {
            const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
            return {
                ...p,
                totalBuyIns,
                profitLoss: p.finalChips - totalBuyIns,
            }
        });
    }, [activeGame]);

    const transfers = useMemo(() => {
        if (!calculatedPlayers) return [];
        return calculateInterPlayerTransfers(calculatedPlayers);
    }, [calculatedPlayers]);

    useEffect(() => {
        if (isOpen) {
            setSelectedPlayerIds(allPlayersInGame.filter(p => p.whatsappNumber).map(p => p.id));
            setIsSending(false);
            setIsGroupSending(false);
            setIncludeSummary(false);
            setIncludeTimeline(false);
        }
    }, [isOpen, allPlayersInGame]);
    
    useEffect(() => {
        if (!activeGame) return;

        let message = `*Settlement for ${activeGame.venue} on ${format(new Date(activeGame.timestamp), "dd MMM yyyy")}*\n\n`;
        const formattedTransfers = transfers.map(t => t.replace(/<strong>(.*?)<\/strong>/g, '*$1*').replace(/<\/?strong>/g, '*')).join('\n');
        message += `\`\`\`
-----------------------
|  Payment Transfers  |
-----------------------
${formattedTransfers}
\`\`\`\n\n`;
        
        if (includeSummary) {
            message += "*Player Summary*\n";
            calculatedPlayers.forEach(p => {
                message += `${p.name}: Buy-in ₹${p.totalBuyIns}, Return ₹${p.finalChips}, P/L ₹${p.profitLoss.toFixed(0)}\n`;
            });
            message += "\n";
        }

        if (includeTimeline) {
            message += "*Game Timeline*\n";
            const allEvents = activeGame.players.flatMap(p => 
                (p.buyIns || []).map(b => ({
                    timestamp: new Date(b.timestamp),
                    text: `${format(new Date(b.timestamp), 'p')} - ${p.name}: Buy-in ₹${b.amount}`
                }))
            ).concat(
                (activeGame.progressLog || []).flatMap(log => 
                    log.playerStats.map(stat => ({
                        timestamp: new Date(log.timestamp),
                        text: `${format(new Date(log.timestamp), 'p')} - ${stat.name}: Progress P/L ₹${stat.profitLoss.toFixed(0)}`
                    }))
                )
            ).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            allEvents.forEach(event => {
                message += `${event.text}\n`;
            });
        }

        setPreviewMessage(message);

    }, [activeGame, transfers, calculatedPlayers, includeSummary, includeTimeline]);

    const handleSelectPlayer = (playerId: string, isSelected: boolean) => {
        setSelectedPlayerIds(prev => 
            isSelected ? [...prev, playerId] : prev.filter(id => id !== playerId)
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        setSelectedPlayerIds(isChecked ? allPlayersInGame.filter(p => p.whatsappNumber).map(p => p.id) : []);
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(previewMessage).then(() => {
            setIsCopied(true);
            toast({ title: 'Copied!', description: 'Settlement message copied to clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleSendToGroup = async () => {
        const groupId = whatsappConfig.whatsappGroupId;
        if (!groupId) {
            toast({ variant: 'destructive', title: 'Group ID Missing', description: 'WhatsApp Group ID is not configured for this club.'});
            return;
        }
        setIsGroupSending(true);
        try {
            const result = await sendWhatsappMessage({
                to: groupId,
                message: previewMessage,
                isGroup: true,
                apiUrl: whatsappConfig.apiUrl,
                apiToken: whatsappConfig.apiToken,
                senderMobile: whatsappConfig.senderMobile,
            });
            if (result.success) {
                toast({ title: 'Sent to Group!', description: 'The settlement details have been sent.'});
                if (!isSending) onOpenChange(false);
            } else {
                throw new Error(result.error || 'Failed to send to group.');
            }
        } catch(e) {
            const err = e as Error;
            toast({ variant: 'destructive', title: 'Group Send Failed', description: err.message });
        } finally {
            setIsGroupSending(false);
        }
    }

    const handleSend = async () => {
        if (!activeGame || selectedPlayerIds.length === 0) {
            toast({ variant: 'destructive', title: 'No players selected', description: 'Please select at least one player to notify.' });
            return;
        }

        setIsSending(true);
        const playersToSend = allPlayersInGame.filter(p => selectedPlayerIds.includes(p.id) && p.whatsappNumber);
        
        const totalToSend = playersToSend.length;
        
        const { id: toastId, update } = toast({
            title: `Sending ${totalToSend} settlement message(s)...`,
            description: <Progress value={0} className="w-full" />,
        });

        let successfulSends = 0;
        let failedSends = 0;

        for (let i = 0; i < totalToSend; i++) {
            const player = playersToSend[i];
            
            try {
                const result = await sendWhatsappMessage({
                    to: player.whatsappNumber,
                    message: previewMessage,
                    apiUrl: whatsappConfig.apiUrl,
                    apiToken: whatsappConfig.apiToken,
                    senderMobile: whatsappConfig.senderMobile,
                });

                if (result.success) {
                    successfulSends++;
                } else {
                    failedSends++;
                    console.error(`Failed to send to ${player.name}:`, result.error);
                }
            } catch (error) {
                failedSends++;
                console.error(`Exception while sending to ${player.name}:`, error);
            }
            
            const progress = ((i + 1) / totalToSend) * 100;
            update({ id: toastId, description: <Progress value={progress} className="w-full" /> });

            if (i < totalToSend - 1) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        update({
            id: toastId,
            title: 'Sending Complete!',
            description: `Sent to ${successfulSends} player(s). ${failedSends > 0 ? `${failedSends} failed.` : ''}`,
        });

        setIsSending(false);
        if (!isGroupSending) onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Send Settlement Details</DialogTitle>
                    <DialogDescription>Select players and content to notify via WhatsApp. A 10s delay will be applied between messages.</DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4">
                    <div className="space-y-2">
                         <Label>Recipients</Label>
                         <div className="flex items-center space-x-2 border-b pb-2">
                            <Checkbox
                                id="settlement-select-all"
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                checked={allPlayersInGame.filter(p => p.whatsappNumber).length > 0 && selectedPlayerIds.length === allPlayersInGame.filter(p => p.whatsappNumber).length}
                                disabled={isSending || allPlayersInGame.filter(p => p.whatsappNumber).length === 0}
                            />
                            <Label htmlFor="settlement-select-all" className="font-medium">Select All</Label>
                        </div>
                        <ScrollArea className="h-48 border rounded-md p-2">
                            {allPlayersInGame.length > 0 ? (
                                allPlayersInGame.map(player => (
                                    <div key={player.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox 
                                            id={`settle-${player.id}`} 
                                            onCheckedChange={(checked) => handleSelectPlayer(player.id, !!checked)}
                                            checked={selectedPlayerIds.includes(player.id)}
                                            disabled={isSending || !player.whatsappNumber}
                                        />
                                        <Label htmlFor={`settle-${player.id}`} className={cn("flex-1", !player.whatsappNumber && "text-muted-foreground")}>
                                            {player.name}
                                            {!player.whatsappNumber && <span className="text-xs"> (No number)</span>}
                                        </Label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No players in this game.</p>
                            )}
                        </ScrollArea>
                    </div>

                     <div className="space-y-2">
                        <Label>Optional Content</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="include-summary" checked={includeSummary} onCheckedChange={(c) => setIncludeSummary(!!c)} />
                            <Label htmlFor="include-summary">Include Player Summary</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="include-timeline" checked={includeTimeline} onCheckedChange={(c) => setIncludeTimeline(!!c)} />
                            <Label htmlFor="include-timeline">Include Game Timeline</Label>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Message Preview</Label>
                             <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}>
                                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <ScrollArea className="h-40 w-full rounded-md border bg-muted p-4">
                           <pre className="text-sm whitespace-pre-wrap">{previewMessage}</pre>
                        </ScrollArea>
                     </div>
                </div>
                <DialogFooter className="sm:justify-between">
                     <Button
                        variant="secondary"
                        onClick={handleSendToGroup}
                        disabled={isSending || isGroupSending || !whatsappConfig.whatsappGroupId}
                    >
                        {isGroupSending ? <Loader2 className="animate-spin mr-2" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Send to Group
                    </Button>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button variant="outline" disabled={isSending}>Cancel</Button></DialogClose>
                        <Button onClick={handleSend} disabled={isSending || isGroupSending || selectedPlayerIds.length === 0}>
                            {isSending ? <Loader2 className="animate-spin" /> : <> <Send className="mr-2 h-4 w-4" /> Send to {selectedPlayerIds.length} Player(s) </>}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SendMessageDialog: FC<{
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  whatsappConfig: WhatsappConfig,
  masterPlayers: MasterPlayer[],
  toast: ReturnType<typeof useToast>['toast'],
}> = ({ isOpen, onOpenChange, whatsappConfig, toast, masterPlayers }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMessage('');
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!whatsappConfig.whatsappGroupId) {
            toast({
                variant: 'destructive',
                title: 'Group ID is not set',
                description: 'Please configure the WhatsApp Group ID in the club settings.',
            });
            return;
        }
        if (!message) {
            toast({
                variant: 'destructive',
                title: 'Message is empty',
                description: 'Please enter a message to send.',
            });
            return;
        }

        setIsSending(true);
        try {
            const result = await sendWhatsappMessage({
                to: whatsappConfig.whatsappGroupId,
                message,
                isGroup: true,
                apiUrl: whatsappConfig.apiUrl,
                apiToken: whatsappConfig.apiToken,
                senderMobile: whatsappConfig.senderMobile,
            });

            if (result.success) {
                toast({
                    title: 'Message Sent!',
                    description: 'Your message has been sent to the group.',
                });
                if (!isSending) onOpenChange(false);
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Message',
                description: error.message,
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Group Message</DialogTitle>
                    <DialogDescription>
                        This message will be sent to your configured WhatsApp group.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="group-message">Message</Label>
                    <Textarea
                        id="group-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="mt-2 min-h-[120px]"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSending}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : 'Send'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


const BuyInSummaryDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeGame: GameHistory | null;
    whatsappConfig: WhatsappConfig;
    toast: ReturnType<typeof useToast>['toast'];
    masterPlayers: MasterPlayer[];
}> = ({ isOpen, onOpenChange, activeGame, whatsappConfig, toast, masterPlayers }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    const playersInGame = useMemo(() => {
        if (!activeGame) return [];
        return activeGame.players.map(p => {
            const masterPlayer = masterPlayers.find(mp => mp.name === p.name);
            return {
                ...p,
                whatsappNumber: masterPlayer?.whatsappNumber || p.whatsappNumber,
            }
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeGame, masterPlayers]);

    useEffect(() => {
        if (isOpen) {
            setSelectedPlayerIds(playersInGame.filter(p => p.whatsappNumber).map(p => p.id));
        }
    }, [isOpen, playersInGame]);

    const handleSelectPlayer = (playerId: string, isSelected: boolean) => {
        setSelectedPlayerIds(prev => 
            isSelected ? [...prev, playerId] : prev.filter(id => id !== playerId)
        );
    };

    const handleSend = async () => {
        if (selectedPlayerIds.length === 0) {
            toast({ variant: 'destructive', title: 'No players selected' });
            return;
        }

        setIsSending(true);
        const playersToSend = playersInGame.filter(p => selectedPlayerIds.includes(p.id) && p.whatsappNumber);
        const totalToSend = playersToSend.length;
        
        const { id: toastId, update } = toast({
            title: `Sending ${totalToSend} summary message(s)...`,
            description: <Progress value={0} className="w-full" />,
        });

        let successfulSends = 0;
        let failedSends = 0;
        
        for (let i = 0; i < totalToSend; i++) {
            const player = playersToSend[i];
            
            const totalBuyIns = (player.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
            
            let playerMessage = `*Buy-in Summary for ${activeGame?.venue}*\n\n`;
            playerMessage += `Hi *${player.name}*, here is your summary:\n`;
            playerMessage += `*Total Buy-in*: ₹${totalBuyIns}\n\n`;
            
            const verifiedBuyIns = (player.buyIns || []).filter(bi => bi.status === 'verified');
            if (verifiedBuyIns.length > 0) {
                playerMessage += `*Details*:\n`;
                verifiedBuyIns.forEach((bi, index) => {
                    playerMessage += `${index + 1}. ₹${bi.amount} at ${format(new Date(bi.timestamp), 'p')}\n`;
                });
            }
            
            try {
                const result = await sendWhatsappMessage({
                    to: player.whatsappNumber,
                    message: playerMessage.trim(),
                    apiUrl: whatsappConfig.apiUrl,
                    apiToken: whatsappConfig.apiToken,
                    senderMobile: whatsappConfig.senderMobile,
                });
                if (result.success) {
                    successfulSends++;
                } else {
                    failedSends++;
                    console.error(`Failed to send summary to ${player.name}:`, result.error);
                }
            } catch(e) {
                failedSends++;
                console.error(`Exception sending summary to ${player.name}:`, e);
            }
            
            const progress = ((i + 1) / totalToSend) * 100;
            update({ id: toastId, description: <Progress value={progress} className="w-full" /> });

            if (i < totalToSend - 1) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        update({
            id: toastId,
            title: 'Sending Complete!',
            description: `Sent summaries to ${successfulSends} player(s). ${failedSends > 0 ? `${failedSends} failed.` : ''}`,
        });

        setIsSending(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Buy-in Summary</DialogTitle>
                    <DialogDescription>Select players to send their current total buy-in amount via WhatsApp. A 10s delay is applied between messages.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Recipients</Label>
                        <ScrollArea className="h-48 border rounded-md p-2">
                            {playersInGame.map(player => (
                                <div key={player.id} className="flex items-center space-x-2 p-1">
                                    <Checkbox 
                                        id={`summary-${player.id}`} 
                                        onCheckedChange={(checked) => handleSelectPlayer(player.id, !!checked)}
                                        checked={selectedPlayerIds.includes(player.id)}
                                        disabled={!player.whatsappNumber || isSending}
                                    />
                                    <Label htmlFor={`summary-${player.id}`} className={cn(!player.whatsappNumber && "text-muted-foreground")}>
                                        {player.name} {!player.whatsappNumber && "(No number)"}
                                    </Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSending}>Cancel</Button></DialogClose>
                    <Button onClick={handleSend} disabled={isSending || selectedPlayerIds.length === 0}>
                        {isSending ? <Loader2 className="animate-spin" /> : `Send to ${selectedPlayerIds.length} Player(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};



const BuyInRequestModalDialog: FC<{
    request: BuyInRequest | null,
    onOpenChange: () => void,
    onApprove: (playerId: string, buyInId: string) => void,
}> = ({ request, onOpenChange, onApprove }) => {
    return (
        <Dialog open={!!request} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Buy-in Request</DialogTitle>
                </DialogHeader>
                {request && (
                    <div className="py-4">
                        <p className="text-lg">
                            <span className="font-bold">{request.playerName}</span> has requested a buy-in of <span className="font-bold text-primary">₹{request.amount}</span>.
                        </p>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <Button onClick={() => request && onApprove(request.playerId, request.id)}>
                        Approve &amp; Send OTP
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
    
const DeckChangeAlertDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ isOpen, onOpenChange }) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex justify-center mb-4">
                        <Clock className="h-12 w-12 text-primary"/>
                    </div>
                    <AlertDialogTitle className="text-center">Deck Change Reminder</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Time for a new deck! It's been 5 minutes to the scheduled change.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>Got it</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const BookingView: FC<{
    currentUser: MasterPlayer;
    activeClub: Club | null;
    toast: ReturnType<typeof useToast>['toast'];
    onStartGame: (venue: string, date: Date, time: string, seats: number, preBookedPlayerIds: string[], clubId: string) => void;
}> = ({ currentUser, activeClub, toast, onStartGame }) => {
    const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
    const [bookings, setBookings] = useState<Record<string, SeatBooking[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [bookingState, setBookingState] = useState<Record<string, SeatBooking | null>>({});

    const refreshData = useCallback(async () => {
        if (!activeClub) return;
        try {
            const games = await getScheduledGamesForClub(activeClub.id);
            setScheduledGames(games);

            const allBookings: Record<string, SeatBooking[]> = {};
            const playerBookings: Record<string, SeatBooking | null> = {};

            for (const game of games) {
                const gameBookings = await getSeatBookingsForGame(game.id);
                allBookings[game.id] = gameBookings;
                const playerBooking = gameBookings.find(b => b.playerId === currentUser.id) || null;
                playerBookings[game.id] = playerBooking;
            }
            setBookings(allBookings);
            setBookingState(playerBookings);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load booking information.'});
        } finally {
            setIsLoading(false);
        }
    }, [activeClub, currentUser.id, toast]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);
    
    const upcomingGames = useMemo(() => {
        return scheduledGames.filter(game => {
             const gameDateTime = parse(`${game.gameDate} ${game.gameStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
             return new Date() < gameDateTime;
        });
    }, [scheduledGames]);
    
    const handleStartScheduledGame = (game: ScheduledGame) => {
        const confirmedBookingsForGame = (bookings[game.id] || []).filter(b => b.status === 'confirmed');
        const preBookedPlayerIds = confirmedBookingsForGame.map(b => b.playerId);
        
        onStartGame(
            'Scheduled Game', // Venue will be set from a master list or created. Here we use a placeholder.
            parse(game.gameDate, 'yyyy-MM-dd', new Date()),
            game.gameStartTime,
            game.totalSeats,
            preBookedPlayerIds,
            game.clubId
        );
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-6 w-6"/> Bookings</CardTitle>
                <CardDescription>View and book your seat for upcoming games. Seats are limited!</CardDescription>
            </CardHeader>
            <CardContent>
                {upcomingGames.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No upcoming games are scheduled yet.</p>
                ) : (
                    <div className="space-y-4">
                        {upcomingGames.map(game => (
                            <GameBookingCard
                                key={game.id}
                                game={game}
                                bookings={bookings[game.id] || []}
                                playerBooking={bookingState[game.id]}
                                currentUser={currentUser}
                                activeClub={activeClub}
                                toast={toast}
                                onBookingChange={refreshData}
                                onStartGame={handleStartScheduledGame}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const GameBookingCard: FC<{
    game: ScheduledGame;
    bookings: SeatBooking[];
    playerBooking: SeatBooking | null;
    currentUser: MasterPlayer;
    activeClub: Club | null;
    toast: ReturnType<typeof useToast>['toast'];
    onBookingChange: () => void;
    onStartGame: (game: ScheduledGame) => void;
}> = ({ game, bookings, playerBooking, currentUser, activeClub, toast, onBookingChange, onStartGame }) => {
    
    const [otp, setOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const confirmedBookings = useMemo(() => bookings.filter(b => b.status === 'confirmed'), [bookings]);
    const waitingList = useMemo(() => bookings.filter(b => b.status === 'waiting_list'), [bookings]);
    
    const seatsRemaining = game.totalSeats - confirmedBookings.length;
    const isFull = seatsRemaining <= 0;

    const gameDateTime = useMemo(() => {
        return parse(`${game.gameDate} ${game.gameStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
    }, [game.gameDate, game.gameStartTime]);

    const formattedGameDateTime = format(gameDateTime, 'EEEE - dd/MM/yyyy - hh:mm a');

    const isGameTimePassed = useMemo(() => new Date() > gameDateTime, [gameDateTime]);

    const handleBookSeat = async (joinWaitingList = false) => {
        if (!currentUser.whatsappNumber || !activeClub) {
            toast({ variant: 'destructive', title: 'Cannot Book', description: 'Your WhatsApp number is not set.' });
            return;
        }

        setIsSubmitting(true);
        try {
            // No OTP for waiting list
            if (joinWaitingList) {
                const bookingData: Omit<SeatBooking, 'id' | 'bookedAt'> = {
                    scheduledGameId: game.id,
                    clubId: activeClub.id,
                    playerId: currentUser.id,
                    playerName: currentUser.name,
                    playerWhatsappNumber: currentUser.whatsappNumber,
                    status: 'waiting_list',
                    confirmationType: 'admin', // Waiting list is auto-confirmed if a spot opens
                };
                await createSeatBooking(bookingData);
                
                // Send WhatsApp notification for waiting list
                await sendWhatsappMessage({
                    to: currentUser.whatsappNumber,
                    message: `Hi ${currentUser.name}, you have been added to the waiting list for the game on ${formattedGameDateTime}. We will notify you if a seat becomes available.`,
                    ...(activeClub.whatsappConfig || {})
                });

                onBookingChange();
                toast({ title: 'Added to Waiting List', description: "We'll notify you if a spot opens up." });
                return;
            }

            const result = await sendBookingOtp({
                playerName: currentUser.name,
                whatsappNumber: currentUser.whatsappNumber,
                gameDate: formattedGameDateTime,
                clubId: activeClub.id,
            });

            if (result.success && result.otp) {
                const bookingData: Omit<SeatBooking, 'id' | 'bookedAt'> = {
                    scheduledGameId: game.id,
                    clubId: activeClub.id,
                    playerId: currentUser.id,
                    playerName: currentUser.name,
                    playerWhatsappNumber: currentUser.whatsappNumber,
                    status: 'pending_otp',
                    confirmationType: 'otp',
                    otp: result.otp,
                    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                };
                await createSeatBooking(bookingData);
                onBookingChange();
                toast({ title: 'OTP Sent', description: 'Check your WhatsApp for the confirmation code.' });
            } else {
                throw new Error(result.error || 'Failed to send OTP.');
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not start booking process.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmOtp = async () => {
        if (!playerBooking || !playerBooking.otp || !activeClub || !currentUser.whatsappNumber) return;
        setIsSubmitting(true);
        if (playerBooking.otp === otp) {
            try {
                await updateSeatBooking(playerBooking.id, { status: 'confirmed' });
                toast({ title: 'Seat Confirmed!', description: 'Your seat is booked.' });

                // Send confirmation message
                const message = `Hi ${currentUser.name}, your seat for the game on ${formattedGameDateTime} is confirmed. See you at the table!\n\n- ${activeClub.name}`;
                await sendWhatsappMessage({
                    to: currentUser.whatsappNumber,
                    message: message,
                    ...(activeClub.whatsappConfig || {})
                });

                onBookingChange();
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not confirm your seat.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code is incorrect.' });
        }
        setIsSubmitting(false);
    };

    const handleCancelBooking = async () => {
        if (!playerBooking) return;
        setIsSubmitting(true);
        try {
            await cancelSeatBooking(playerBooking.id);
            toast({ title: 'Booking Cancelled', description: 'Your spot has been released.' });

            // Auto-promote from waiting list if a seat opened up
            if (playerBooking.status === 'confirmed' && waitingList.length > 0) {
                const firstInWaiting = waitingList.sort((a,b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime())[0];
                await updateSeatBooking(firstInWaiting.id, { status: 'confirmed' });
                
                // Notify promoted player
                if (firstInWaiting.playerWhatsappNumber && activeClub) {
                    await sendWhatsappMessage({
                        to: firstInWaiting.playerWhatsappNumber,
                        message: `Great news, ${firstInWaiting.playerName}! A spot has opened up for the game on ${formattedGameDateTime}. Your seat is now confirmed!`,
                        ...(activeClub.whatsappConfig || {})
                    });
                }
            }
            onBookingChange();
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel booking.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderBookingStatus = () => {
        if (isGameTimePassed && playerBooking?.status !== 'confirmed') {
            return <p className="text-sm font-semibold text-muted-foreground">Booking has closed.</p>;
        }
        
        if (playerBooking?.status === 'confirmed') {
            return (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <CheckCircle2 className="h-5 w-5"/> Your Seat is Confirmed
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleCancelBooking} disabled={isSubmitting || isGameTimePassed}>
                        Cancel Booking
                    </Button>
                </div>
            );
        }

        if (playerBooking?.status === 'waiting_list') {
             return (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 text-amber-600 font-semibold">
                        <Hourglass className="h-5 w-5"/> You're on the Waiting List (#{waitingList.findIndex(p => p.playerId === currentUser.id) + 1})
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleCancelBooking} disabled={isSubmitting || isGameTimePassed}>
                        Leave Waiting List
                    </Button>
                </div>
            );
        }

        if (playerBooking?.status === 'pending_otp') {
            return (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter WhatsApp OTP" className="w-full sm:max-w-xs" />
                    <Button onClick={handleConfirmOtp} disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Seat'}
                    </Button>
                </div>
            );
        }
        
        return (
            <Button onClick={() => handleBookSeat(isFull)} disabled={isSubmitting || isGameTimePassed}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : (isFull ? 'Join Waiting List' : 'Book My Seat')}
            </Button>
        );
    };

    const playerList = (players: SeatBooking[], title: string) => (
        <div>
            <h4 className="font-semibold mb-2">{title} ({players.length})</h4>
            {players.length > 0 ? (
                <ul className="list-decimal list-inside text-sm text-muted-foreground">
                    {players.map(b => <li key={b.id}>{b.playerName}</li>)}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No players yet.</p>}
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <CardTitle>{formattedGameDateTime}</CardTitle>
                        <CardDescription>
                            {isGameTimePassed ? "This game has already started." : isFull ? `${waitingList.length} player(s) on waiting list` : `${seatsRemaining} of ${game.totalSeats} seats remaining`}
                        </CardDescription>
                    </div>
                    {currentUser.isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => onStartGame(game)} disabled={isGameTimePassed}>
                                Start Game
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                                <Link href={`/bookings/${game.id}`}>
                                    <Users className="mr-2 h-4 w-4" /> Manage Bookings
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {renderBookingStatus()}
                </div>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>View Player Lists</AccordionTrigger>
                        <AccordionContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {playerList(confirmedBookings, 'Confirmed Players')}
                                {playerList(waitingList, 'Waiting List')}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};

const ImportGameDialog: FC<{
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  onImport: (gameData: { venue: string; timestamp: string; players: Player[] }) => void,
  toast: ReturnType<typeof useToast>['toast'],
}> = ({ isOpen, onOpenChange, onImport, toast }) => {
    const [gameLog, setGameLog] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = async () => {
        if (!gameLog.trim()) {
            toast({ variant: 'destructive', title: 'Empty Log', description: 'Please paste the game log to import.' });
            return;
        }
        setIsImporting(true);
        try {
            const result = await importGameFromText({ gameLog });
            if (result && result.players) {
                onImport(result);
            } else {
                throw new Error('Failed to parse the game log properly.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Import Game from Text</DialogTitle>
                    <DialogDescription>
                        Paste a raw text log from another poker application. The AI will parse it into a structured game.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="game-log">Game Log</Label>
                    <Textarea
                        id="game-log"
                        className="h-64 mt-2 font-mono text-xs"
                        placeholder="Paste your game log here..."
                        value={gameLog}
                        onChange={(e) => setGameLog(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleImport} disabled={isImporting}>
                        {isImporting ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2" />Import &amp; Process</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const SaveConfirmDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    onConfirmSave: (players: CalculatedPlayer[]) => void,
    title: string,
    description: string,
    buttonText: string,
    isEndGame?: boolean,
}> = ({ isOpen, onOpenChange, activeGame, onConfirmSave, title, description, buttonText, isEndGame = false }) => {
    const [players, setPlayers] = useState<CalculatedPlayer[]>([]);
    
    useEffect(() => {
        if (activeGame && activeGame.players) {
            setPlayers(activeGame.players.map(p => {
                const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
                return {
                    ...p,
                    totalBuyIns,
                    profitLoss: p.finalChips - totalBuyIns
                }
            }));
        }
    }, [activeGame, isOpen]);

    const totals = useMemo(() => {
        return players.reduce((acc, player) => {
            acc.totalBuyIns += player.totalBuyIns || 0;
            acc.finalChips += player.finalChips || 0;
            return acc;
        }, { totalBuyIns: 0, finalChips: 0 });
    }, [players]);

    const handleChipChange = (id: string, value: string) => {
        const numericValue = parseInt(value) || 0;
        setPlayers(prevPlayers => 
            prevPlayers.map(p => p.id === id ? { ...p, finalChips: numericValue } : p)
        );
    };
    
    const handleSave = () => {
        const finalPlayers = players.map(p => ({
            ...p,
            profitLoss: p.finalChips - p.totalBuyIns
        }));
        onConfirmSave(finalPlayers);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>Total Buy-in</TableHead>
                                <TableHead>{isEndGame ? 'Final Chip Count' : 'Current Chip Count'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map(player => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">{player.name}</TableCell>
                                    <TableCell>₹{player.totalBuyIns}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={player.finalChips === 0 ? '' : player.finalChips}
                                            onChange={e => handleChipChange(player.id, e.target.value)}
                                            placeholder="Chip count"
                                            className="w-32"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFoot>
                            <TableRow className="font-bold border-t-2 bg-muted">
                                <TableCell>Totals</TableCell>
                                <TableCell>₹{totals.totalBuyIns}</TableCell>
                                <TableCell>₹{totals.finalChips}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} variant={isEndGame ? 'destructive' : 'default'} dangerouslySetInnerHTML={{ __html: buttonText }}></Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    