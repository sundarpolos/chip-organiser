
"use client"

import { useState, useEffect, useMemo, useCallback, useRef, type FC } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation';
import { detectAnomalousBuyins } from "@/ai/flows/detect-anomalies"
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message"
import { sendBuyInOtp } from "@/ai/flows/send-buyin-otp"
import { importGameFromText } from "@/ai/flows/import-game"
import { sendDeletePlayerOtp } from "@/ai/flows/send-delete-player-otp";
import { sendDeleteGameOtp } from "@/ai/flows/send-delete-game-otp";
import type { Player, MasterPlayer, MasterVenue, GameHistory, CalculatedPlayer, WhatsappConfig, BuyIn } from "@/lib/types"
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
} from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { format, isSameDay, set, intervalToDuration } from "date-fns"
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


const WhatsappIcon = () => (
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
      className="h-4 w-4"
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

const GameLog: FC<{ game: GameHistory }> = ({ game }) => {
    const log = useMemo(() => {
        if (!game) return [];
        return (game.players || [])
            .flatMap(p => (p.buyIns || []).map(b => ({ 
                type: 'Buy-in',
                timestamp: new Date(b.timestamp),
                text: `${p.name} bought in for ₹${b.amount}`
            })))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [game]);

    if (log.length === 0) {
        return <p className="text-muted-foreground text-center py-4">No game activity yet.</p>;
    }

    return (
        <ScrollArea className="h-full">
            <div className="space-y-3">
                {log.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                        <div className="text-muted-foreground min-w-[45px] sm:min-w-[50px]">{format(item.timestamp, 'p')}</div>
                        <div>{item.text}</div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
};

const SettlementPreview: FC<{ calculatedPlayers: CalculatedPlayer[] }> = ({ calculatedPlayers }) => {
    const transfers = useMemo(() => {
        if (!calculatedPlayers) return [];
        return calculateInterPlayerTransfers(calculatedPlayers);
    }, [calculatedPlayers]);

    if (transfers.length === 0) {
        return <p className="text-muted-foreground text-center py-4">No transfers needed yet.</p>;
    }

    return (
        <div className="space-y-2">
            {transfers.map((transfer, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-medium">
                        <span dangerouslySetInnerHTML={{ __html: transfer.split(':')[0] }} />
                    </div>
                    <div className="font-bold text-primary">
                        {transfer.split(':')[1]}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdminView: FC<{
    activeGame: GameHistory;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    updatePlayer: (id: string, newValues: Partial<Player>) => void;
    removePlayer: (id: string) => void;
    handleRunAnomalyDetection: (player: Player) => void;
    isOtpVerificationEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    canEdit: boolean;
    currentUser: MasterPlayer | null;
    setAddPlayerModalOpen: (isOpen: boolean) => void;
    setSaveConfirmOpen: (isOpen: boolean) => void;
    setReportsModalOpen: (isOpen: boolean) => void;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({
    activeGame, activeTab, setActiveTab, updatePlayer, removePlayer, handleRunAnomalyDetection,
    isOtpVerificationEnabled, whatsappConfig, canEdit, currentUser, setAddPlayerModalOpen,
    setSaveConfirmOpen, setReportsModalOpen, toast
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
                                    onRunAnomalyCheck={handleRunAnomalyDetection}
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
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                        <Button onClick={() => setAddPlayerModalOpen(true)} disabled={!canEdit}>
                            <Plus className="mr-2 h-4 w-4" />Add Player(s)
                        </Button>
                        <Button onClick={() => setSaveConfirmOpen(true)} variant="secondary" disabled={!canEdit}><Save className="mr-2 h-4 w-4" />Save Game</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setReportsModalOpen(true)} variant="outline"><FileDown className="mr-2 h-4 w-4" />Reports</Button>
                    </div>
                </CardFooter>
            </Card>

            <Accordion type="multiple" defaultValue={['summary']} className="w-full space-y-4">
                <Card>
                    <AccordionItem value="summary" className="border-b-0">
                        <AccordionTrigger className="p-4">
                            <CardTitle>Player Summary</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <PlayerSummaryTable calculatedPlayers={calculatedPlayers} />
                        </AccordionContent>
                    </AccordionItem>
                </Card>

                <Card>
                    <AccordionItem value="transfers" className="border-b-0">
                        <AccordionTrigger className="p-4">
                            <CardTitle>Money Transfers</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <SettlementPreview calculatedPlayers={calculatedPlayers} />
                        </AccordionContent>
                    </AccordionItem>
                </Card>

                <Card>
                    <AccordionItem value="log" className="border-b-0">
                        <AccordionTrigger className="p-4">
                            <CardTitle>Game Log</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 max-h-60">
                             <GameLog game={activeGame} />
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            </Accordion>
        </div>
    );
};


const PlayerView: FC<{
    currentUser: MasterPlayer;
    joinableGame: GameHistory | null;
    onJoinGame: (gameId: string) => void;
    setLoadGameModalOpen: (isOpen: boolean) => void;
}> = ({
    currentUser, joinableGame, onJoinGame, setLoadGameModalOpen
}) => {
    
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
                <CardFooter>
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
    )
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
          captionLayout="dropdown-buttons"
          fromYear={1990}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  );
};


export default function DashboardPage() {
  const { toast } = useToast()
  const router = useRouter();


  // Core State
  const [activeTab, setActiveTab] = useState<string>("")
  const [isDataReady, setIsDataReady] = useState(false)
  const [isOtpVerificationEnabled, setOtpVerificationEnabled] = useState(true);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [greeting, setGreeting] = useState('');


  // Master Data State
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([])
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([])
  
  // Game History & Results State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null)
  const [gameDuration, setGameDuration] = useState<string>("00:00:00");
  const [joinableGame, setJoinableGame] = useState<GameHistory | null>(null);
  const [hasCheckedForGame, setHasCheckedForGame] = useState(false);

  // App Settings
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
    apiUrl: '',
    apiToken: '',
    senderMobile: ''
  });

  // Modal & Dialog State
  const [isVenueModalOpen, setVenueModalOpen] = useState(false)
  const [isManagePlayersModalOpen, setManagePlayersModalOpen] = useState(false)
  const [isLoadGameModalOpen, setLoadGameModalOpen] = useState(false)
  const [isReportsModalOpen, setReportsModalOpen] = useState(false)
  const [isAnomalyModalOpen, setAnomalyModalOpen] = useState(false)
  const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [isWhatsappSettingsModalOpen, setWhatsappSettingsModalOpen] = useState(false);
  const [isImportGameModalOpen, setImportGameModalOpen] = useState(false);
  const [isSaveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [isAddPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [isSettlementModalOpen, setSettlementModalOpen] = useState(false);
  const [buyInRequestModal, setBuyInRequestModal] = useState<BuyInRequest | null>(null);

  
  // Specific Modal Content State
  const [anomalyPlayer, setAnomalyPlayer] = useState<Player | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<{ score: number; explanation: string } | null>(null);
  const [isAnomalyLoading, setAnomalyLoading] = useState(false);
  const isAdmin = useMemo(() => currentUser?.isAdmin === true, [currentUser]);

  const canEditGame = useMemo(() => {
    if (!activeGame || !currentUser) return false;
    if (isAdmin) return true;
    const gamePlayer = activeGame.players.find(p => p.name === currentUser.name);
    return !!gamePlayer?.isBanker;
  }, [isAdmin, currentUser, activeGame]);


  // Load user data and check auth
  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      router.replace('/login');
    }
  }, [router]);

  // Set greeting message
  useEffect(() => {
    if (currentUser) {
      const messages = [
        `Go get 'em, ${currentUser.name}!`,
        `Today's your day, ${currentUser.name}!`,
        `Stack those chips, ${currentUser.name}!`,
        `Time to crush it, ${currentUser.name}!`,
        `Let's see that winner's smile, ${currentUser.name}!`
      ];
      setGreeting(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [currentUser]);

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
        if (!currentUser) return;
        try {
            const [
                loadedMasterPlayers,
                loadedMasterVenues,
                loadedGameHistory,
            ] = await Promise.all([
                getMasterPlayers(),
                getMasterVenues(),
                getGameHistory(),
            ]);

            setMasterPlayers(loadedMasterPlayers);
            setMasterVenues(loadedMasterVenues);
            setGameHistory(loadedGameHistory);
            
            const savedOtpPreference = localStorage.getItem("isOtpVerificationEnabled");
            if (savedOtpPreference !== null) {
                setOtpVerificationEnabled(JSON.parse(savedOtpPreference));
            }

            const savedWhatsappConfig = localStorage.getItem("whatsappConfig");
            if (savedWhatsappConfig) {
              setWhatsappConfig(JSON.parse(savedWhatsappConfig));
            } else {
              setWhatsappConfig({
                apiUrl: process.env.NEXT_PUBLIC_WHATSAPP_API_URL || '',
                apiToken: process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '',
                senderMobile: process.env.NEXT_PUBLIC_WHATSAPP_SENDER_MOBILE || ''
              });
            }
            
            // Check for active games for non-admins
            if (!isAdmin) {
                const today = new Date();
                const activeGameForToday = loadedGameHistory.find(g => isSameDay(new Date(g.timestamp), today) && !g.endTime);
                
                if (activeGameForToday) {
                    const isPlayerInGame = activeGameForToday.players.some(p => p.name === currentUser.name);
                    if (isPlayerInGame) {
                        loadGameIntoState(activeGameForToday);
                    } else {
                        setJoinableGame(activeGameForToday);
                    }
                }
            }
            if(isAdmin) {
                setLoadGameModalOpen(true);
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
    localStorage.setItem("whatsappConfig", JSON.stringify(whatsappConfig));
  }, [isOtpVerificationEnabled, whatsappConfig, isDataReady])

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
  

  const handleLogout = () => {
    localStorage.removeItem('chip-maestro-user');
    setActiveGame(null);
    setJoinableGame(null);
    router.replace('/login');
  };

  const addPlayers = async (playersToAdd: MasterPlayer[]) => {
      if (!activeGame) return;

      const newPlayers: Player[] = playersToAdd.map(playerToAdd => ({
          id: `player-${Date.now()}-${playerToAdd.id}`,
          name: playerToAdd.name,
          whatsappNumber: playerToAdd.whatsappNumber,
          isBanker: playerToAdd.isBanker,
          buyIns: [],
          finalChips: 0,
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
  
    const handleSaveGame = async (finalPlayers: CalculatedPlayer[]) => {
    if (!activeGame) return;

    if (finalPlayers.length === 0) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "There is no active game data to save." });
        return;
    }

    if (finalPlayers.some(p => !p.name)) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "Please ensure all players have a name." });
        return;
    }

    if (finalPlayers.some(p => (p.buyIns || []).some(b => b.status !== 'verified' && b.amount > 0))) {
      toast({ variant: "destructive", title: "Unverified Buy-ins", description: "Please verify all buy-ins before saving." });
      return;
    }
    
    const now = new Date();
    
    // Create a serializable version of the players
    const serializablePlayers = finalPlayers.map(p => ({
        id: p.id,
        name: p.name,
        whatsappNumber: p.whatsappNumber,
        isBanker: p.isBanker,
        buyIns: p.buyIns.map(b => ({
            id: b.id,
            amount: b.amount,
            timestamp: b.timestamp,
            status: b.status,
        })),
        finalChips: p.finalChips,
    }));

    const finalGame: GameHistory = {
        ...activeGame,
        players: serializablePlayers as any, // Use `any` to bypass strict type checking for the save
        endTime: now.toISOString(),
        duration: activeGame.startTime ? (now.getTime() - new Date(activeGame.startTime).getTime()) : undefined
    }

    try {
        const savedGame = await saveGameHistory(finalGame);
        const existingGameIndex = gameHistory.findIndex(g => g.id === savedGame.id);

        let updatedHistory;
        if (existingGameIndex !== -1) {
            updatedHistory = [...gameHistory];
            updatedHistory[existingGameIndex] = savedGame;
            toast({ title: "Game Updated!", description: `${finalGame.venue} has been updated in your history.` });
        } else {
            updatedHistory = [savedGame, ...gameHistory];
            toast({ title: "Game Saved!", description: `${finalGame.venue} has been saved to your history.` });
        }
        
        setGameHistory(updatedHistory);
        setSaveConfirmOpen(false);
    } catch (error) {
        console.error("Failed to save game:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save game to the cloud." });
    }
  };
  
    const handleJoinGame = async (gameId: string) => {
        const gameToJoin = gameHistory.find(g => g.id === gameId);
        if (gameToJoin && currentUser) {
            
            const isAlreadyInGame = gameToJoin.players.some(p => p.name === currentUser.name);
            if(isAlreadyInGame) {
                await loadGameIntoState(gameToJoin);
                setJoinableGame(null);
                setLoadGameModalOpen(false);
                return;
            }

            const playerToAdd: MasterPlayer = {
                id: currentUser.id,
                name: currentUser.name,
                whatsappNumber: currentUser.whatsappNumber,
                isAdmin: currentUser.isAdmin,
                isBanker: currentUser.isBanker,
                isActive: currentUser.isActive,
            };
            
            const newPlayer: Player = {
                id: `player-${Date.now()}-${playerToAdd.id}`,
                name: playerToAdd.name,
                whatsappNumber: playerToAdd.whatsappNumber,
                isBanker: playerToAdd.isBanker,
                buyIns: [],
                finalChips: 0,
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
        await loadGameIntoState(gameToLoad);
        setLoadGameModalOpen(false);
        toast({ title: "Game Loaded", description: `Loaded game from ${format(new Date(gameToLoad.timestamp), "dd/MMM/yy")}.` });
    }
  };

  const handleDeleteGame = async (gameId: string) => {
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
    setActiveGame(null);
    setVenueModalOpen(true);
  }
  
  const handleStartGameFromVenue = async (venue: string, date: Date) => {
    if (!masterVenues.some(v => v.name === venue)) {
        const venueData: Omit<MasterVenue, 'id'> = { name: venue };
        const savedVenue = await saveMasterVenue(venueData);
        setMasterVenues(prev => [...prev, savedVenue]);
    }
    
    const now = new Date();
    const finalTimestamp = set(date, { 
      hours: now.getHours(), 
      minutes: now.getMinutes(), 
      seconds: now.getSeconds() 
    }).toISOString();

    const newGame: GameHistory = {
        id: `game-${Date.now()}`,
        venue: venue,
        timestamp: finalTimestamp,
        players: [],
        startTime: now.toISOString(),
    }
    await saveGameHistory(newGame);
    setActiveGame(newGame);
    
    setVenueModalOpen(false);
    setAddPlayerModalOpen(true);
  }

  const handleVenueChange = async (newVenue: string) => {
    if (!activeGame || newVenue === activeGame.venue) return;

    if (!masterVenues.some(v => v.name === newVenue)) {
        const venueData: Omit<MasterVenue, 'id'> = { name: newVenue };
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

  const handleRunAnomalyDetection = async (player: Player) => {
    setAnomalyPlayer(player);
    setAnomalyModalOpen(true);
    setAnomalyLoading(true);
    setAnomalyResult(null);

    const playerBuyIns = (player.buyIns || []).map(b => ({
      playerName: player.name,
      amount: b.amount,
      timestamp: b.timestamp,
    }));
    
    const historicalBuyIns = gameHistory
      .flatMap(g => g.players)
      .filter(p => p.name === player.name)
      .flatMap(p => (p.buyIns || []))
      .map(b => ({
        playerName: player.name,
        amount: b.amount,
        timestamp: b.timestamp,
      }));

    try {
      const result = await detectAnomalousBuyins({ playerBuyIns, historicalBuyIns });
      setAnomalyResult({ score: result.anomalyScore, explanation: result.explanation });
    } catch (error) {
      console.error("Anomaly detection failed", error);
      toast({ variant: "destructive", title: "Analysis Failed", description: "Could not run anomaly detection." });
      setAnomalyResult({ score: -1, explanation: "An error occurred during analysis." });
    } finally {
      setAnomalyLoading(false);
    }
  };

  const handleImportedGame = async (importedGame: { venue: string; timestamp: string; players: Player[] }) => {
    const existingMasterNames = masterPlayers.map(mp => mp.name);
    const newMasterPlayersPromises: Promise<MasterPlayer>[] = importedGame.players
        .filter(p => !existingMasterNames.includes(p.name))
        .map(async p => {
            const newPlayer: Omit<MasterPlayer, 'id'> = {
                name: p.name,
                whatsappNumber: p.whatsappNumber || "",
                isAdmin: false,
                isBanker: false,
                isActive: true,
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
        const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
        return {
            id: p.id,
            name: p.name,
            whatsappNumber: p.whatsappNumber || "",
            isBanker: p.isBanker || false,
            buyIns: (p.buyIns || []).map(b => ({
                id: b.id,
                amount: b.amount,
                timestamp: b.timestamp,
                status: b.status,
            })),
            finalChips: p.finalChips,
        }
    });

    const newGame: GameHistory = {
        id: `game-import-${Date.now()}`,
        venue: importedGame.venue,
        timestamp: newGameDate.toISOString(),
        players: serializablePlayers as any, // Use `any` to bypass strict type checking
        startTime: newGameDate.toISOString(),
        endTime: new Date().toISOString(),
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
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <div className="flex-1">
           {activeGame ? (
              <EditableVenue
                venue={activeGame.venue}
                masterVenues={masterVenues}
                onVenueChange={handleVenueChange}
                isAdmin={isAdmin}
              />
            ) : (
              <h1 className="text-2xl font-bold truncate">Smart Club Organiser</h1>
            )}
           <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-2">
            {activeGame && activeGame.players.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {activeGame.players.length}
                </Badge>
             )}
            {activeGame && (
                <EditableDate date={activeGame.timestamp} onDateChange={handleDateChange} isAdmin={isAdmin}/>
            )}
            {activeGame?.startTime && (
                <div className="flex items-center gap-1">
                    <TimerIcon className="h-4 w-4" />
                    <span>{gameDuration}</span>
                </div>
            )}
            {greeting && activeGame && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <p className="font-semibold text-primary">{greeting}</p>
              </>
            )}
           </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && <>
                <Button onClick={handleNewGame} variant="destructive"><Plus className="mr-2 h-4 w-4" />New Game</Button>
            </>}
            <Button onClick={() => setLoadGameModalOpen(true)} variant="outline"><History className="mr-2 h-4 w-4" />Load Game</Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setManagePlayersModalOpen(true)} disabled={!isAdmin}>
                    <BookUser className="h-4 w-4 mr-2" />
                    Manage Players
                </DropdownMenuItem>
                 <DropdownMenuItem asChild disabled={!isAdmin}>
                   <Link href="/merge">
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Players
                   </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild disabled={!isAdmin}>
                   <Link href="/reports">
                      <History className="h-4 w-4 mr-2" />
                      Game History
                   </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!isAdmin}>
                  <MessageCircleCode className="h-4 w-4 mr-2" />
                  <Label htmlFor="otp-verification-toggle" className="pr-2 flex-1">OTP Verification</Label>
                  <Switch
                      id="otp-verification-toggle"
                      checked={isOtpVerificationEnabled}
                      onCheckedChange={setOtpVerificationEnabled}
                      disabled={!isAdmin}
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setImportGameModalOpen(true)} disabled={!isAdmin}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Game
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setWhatsappModalOpen(true)} disabled={!isAdmin}>
                  <WhatsappIcon />
                  <span className="ml-2">Group Message</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setWhatsappSettingsModalOpen(true)} disabled={!isAdmin}>
                  <Settings className="h-4 w-4 mr-2" />
                  WA Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      
        {activeGame ? (
            <AdminView
                activeGame={activeGame}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                updatePlayer={updatePlayer}
                removePlayer={removePlayer}
                handleRunAnomalyDetection={handleRunAnomalyDetection}
                isOtpVerificationEnabled={isOtpVerificationEnabled}
                whatsappConfig={whatsappConfig}
                canEdit={canEditGame}
                currentUser={currentUser}
                setAddPlayerModalOpen={setAddPlayerModalOpen}
                setSaveConfirmOpen={setSaveConfirmOpen}
                setReportsModalOpen={setReportsModalOpen}
                toast={toast}
            />
        ) : !isAdmin && hasCheckedForGame ? (
            <PlayerView
                currentUser={currentUser}
                joinableGame={joinableGame}
                onJoinGame={handleJoinGame}
                setLoadGameModalOpen={setLoadGameModalOpen}
            />
        ) : (isAdmin && !activeGame && isDataReady && (
            <div className="text-center py-20">
                <h2 className="text-2xl font-semibold mb-2">Welcome, {currentUser.name}!</h2>
                <p className="text-muted-foreground mb-6">There's no active game. You can start a new one or load a previous game.</p>
                <div className="flex justify-center gap-4">
                     <Button onClick={handleNewGame} variant="destructive"><Plus className="mr-2 h-4 w-4" />New Game</Button>
                     <Button onClick={() => setLoadGameModalOpen(true)} variant="outline"><History className="mr-2 h-4 w-4" />Load Game</Button>
                </div>
            </div>
        ))}

      <VenueDialog 
        isOpen={isVenueModalOpen}
        onOpenChange={setVenueModalOpen}
        masterVenues={masterVenues}
        onStartGame={handleStartGameFromVenue}
        setMasterVenues={setMasterVenues}
        toast={toast}
        initialDate={new Date()}
      />
      <ManagePlayersDialog 
        isOpen={isManagePlayersModalOpen}
        onOpenChange={setManagePlayersModalOpen}
        masterPlayers={masterPlayers}
        setMasterPlayers={setMasterPlayers}
        currentUser={currentUser}
        whatsappConfig={whatsappConfig}
        toast={toast}
        gameHistory={gameHistory}
        setGameHistory={setGameHistory}
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
      <AnomalyReportDialog
        isOpen={isAnomalyModalOpen}
        onOpenChange={setAnomalyModalOpen}
        player={anomalyPlayer}
        isLoading={isAnomalyLoading}
        result={anomalyResult}
      />
      <WhatsappDialog
        isOpen={isWhatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
        whatsappConfig={whatsappConfig}
        masterPlayers={masterPlayers}
      />
      <WhatsappSettingsDialog
        isOpen={isWhatsappSettingsModalOpen}
        onOpenChange={setWhatsappSettingsModalOpen}
        config={whatsappConfig}
        onSave={setWhatsappConfig}
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
        onConfirmSave={handleSaveGame}
      />
      <SettlementDialog
        isOpen={isSettlementModalOpen}
        onOpenChange={setSettlementModalOpen}
        activeGame={activeGame}
        whatsappConfig={whatsappConfig}
        toast={toast}
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
    </div>
  )
}

const BuyInRequestPopover: FC<{
    onBuyInRequest: (amount: number) => void;
}> = ({ onBuyInRequest }) => {
    const [amount, setAmount] = useState<number | string>("");
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button><Plus className="mr-2" />Request Buy-in</Button>
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
                                // Trigger popover close
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
                        Add & Verify
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
                    {isSending ? <Loader2 className="animate-spin" /> : <>Approve & Send OTP</>}
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
  onRunAnomalyCheck: (player: Player) => void;
  isOtpEnabled: boolean;
  whatsappConfig: WhatsappConfig;
  canEdit: boolean;
  currentUser: MasterPlayer | null;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string; }) => void;
  activeGame: GameHistory;
}> = ({ player, onUpdate, onRemove, onRunAnomalyCheck, isOtpEnabled, whatsappConfig, canEdit, currentUser, toast, activeGame }) => {
  const isCurrentUser = player.name === currentUser?.name;
  const isAdmin = currentUser?.isAdmin === true;

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
                        <div className="flex justify-between items-center w-full pr-2">
                             <div className="text-sm">
                                <span className="font-bold">{totalBuyInCount}</span> buy-in(s)
                             </div>
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
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="mt-4 flex items-center justify-end">
                    <div className="flex gap-2">
                        {isCurrentUser && !canEdit ? (
                        <BuyInRequestPopover onBuyInRequest={handleBuyInRequest} />
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
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => onRunAnomalyCheck(player)} variant="ghost" disabled={!player.name || !isAdmin} size="icon">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="sr-only">Analyze Buy-ins</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Analyze Buy-ins</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {canEdit && (
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
                )}
            </div>
        </div>
        
    </div>
  )
}

const VenueDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  masterVenues: MasterVenue[];
  setMasterVenues: React.Dispatch<React.SetStateAction<MasterVenue[]>>;
  onStartGame: (venue: string, date: Date) => void;
  toast: ReturnType<typeof useToast>['toast'];
  initialDate: Date;
}> = ({ isOpen, onOpenChange, masterVenues, setMasterVenues, onStartGame, toast, initialDate }) => {
    const [venue, setVenue] = useState("");
    const [selectedDate, setSelectedDate] = useState(initialDate);

    const handleStart = () => {
        if (!venue.trim()) {
            toast({ variant: "destructive", title: "Venue Required", description: "Please enter or select a venue name." });
            return;
        }
        onStartGame(venue.trim(), selectedDate);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start New Game</DialogTitle>
                    <DialogDescription>Enter a new venue or select from your saved list.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="venue-name">Venue Name</Label>
                        <Input id="venue-name" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., The Poker Den" />
                    </div>
                    {masterVenues.length > 0 && (
                        <div className="space-y-2">
                            <Label>Or Select Existing</Label>
                            <Select onValueChange={setVenue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a venue..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {masterVenues.map(v => (
                                        <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="game-date">Game Date</Label>
                       <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} initialFocus />
                          </PopoverContent>
                      </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleStart}>Start Game</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditPlayerDialog: FC<{
    player: MasterPlayer | null;
    onOpenChange: (open: boolean) => void;
    onSave: (player: MasterPlayer) => Promise<void>;
}> = ({ player, onOpenChange, onSave }) => {
    const [editablePlayer, setEditablePlayer] = useState<MasterPlayer | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (player) {
            setEditablePlayer(JSON.parse(JSON.stringify(player)));
        } else {
            setEditablePlayer(null);
        }
    }, [player]);

    if (!editablePlayer) {
        return null;
    }

    const handleSave = async () => {
        if (!editablePlayer) return;
        setIsSaving(true);
        await onSave(editablePlayer);
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={!!player} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Player: {editablePlayer.name}</DialogTitle>
                    <DialogDescription>
                        Update the player's details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-name">Player Name</Label>
                        <Input
                            id="edit-player-name"
                            value={editablePlayer.name}
                            onChange={(e) => setEditablePlayer(p => p ? { ...p, name: e.target.value } : null)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const ManagePlayersDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  masterPlayers: MasterPlayer[];
  setMasterPlayers: React.Dispatch<React.SetStateAction<MasterPlayer[]>>;
  currentUser: MasterPlayer | null;
  whatsappConfig: WhatsappConfig;
  toast: ReturnType<typeof useToast>['toast'];
  gameHistory: GameHistory[];
  setGameHistory: React.Dispatch<React.SetStateAction<GameHistory[]>>;
}> = ({ isOpen, onOpenChange, masterPlayers, setMasterPlayers, currentUser, whatsappConfig, toast, gameHistory, setGameHistory }) => {
    const [editablePlayers, setEditablePlayers] = useState<MasterPlayer[]>([]);
    const [playerToEdit, setPlayerToEdit] = useState<MasterPlayer | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState<MasterPlayer | null>(null);
    const [isSorted, setIsSorted] = useState(false);
    
    const originalPlayersRef = useRef<MasterPlayer[]>([]);

    useEffect(() => {
        if (isOpen) {
            const sorted = masterPlayers.sort((a,b) => a.name.localeCompare(b.name));
            setEditablePlayers(JSON.parse(JSON.stringify(sorted)));
            originalPlayersRef.current = JSON.parse(JSON.stringify(sorted));
        }
    }, [isOpen, masterPlayers]);

    const handleFieldChange = (playerId: string, field: keyof Omit<MasterPlayer, 'id'>, value: string | boolean) => {
        setEditablePlayers(prev => 
            prev.map(p => p.id === playerId ? { ...p, [field]: value } : p)
        );
    };

    const addNewPlayerRow = () => {
        const newPlayer: MasterPlayer = {
            id: `new-${Date.now()}`,
            name: '',
            whatsappNumber: '',
            isAdmin: false,
            isBanker: false,
            isActive: true,
        };
        setEditablePlayers(prev => [newPlayer, ...prev]);
    };

    const handleSavePlayer = async (playerToSave: MasterPlayer) => {
        setIsSaving(true);
        try {
            const originalPlayer = originalPlayersRef.current.find(p => p.id === playerToSave.id);
            const nameHasChanged = originalPlayer && originalPlayer.name !== playerToSave.name;
            
            await saveMasterPlayer(playerToSave, { updateGames: nameHasChanged, oldName: originalPlayer?.name });
            
            const [finalMasterPlayers, finalGameHistory] = await Promise.all([
                getMasterPlayers(),
                getGameHistory()
            ]);
            setMasterPlayers(finalMasterPlayers);
            setGameHistory(finalGameHistory);

            toast({ title: "Player Saved", description: `${playerToSave.name}'s details have been updated.` });
        } catch (error) {
            console.error("Failed to save player", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save player details." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // Filter out any changes to name/whatsapp from here, only save roles/status
            const savePromises = editablePlayers.map(player => {
                if (player.id.startsWith('new-') && !player.name) return null;

                const originalPlayer = originalPlayersRef.current.find(p => p.id === player.id);

                if (player.id.startsWith('new-')) {
                     const { id, ...newPlayer } = player;
                     return saveMasterPlayer(newPlayer, { updateGames: false });
                } else {
                     // Only save roles and status from this bulk action
                     const playerToSave = {
                        ...originalPlayer!, //we know it exists
                        isAdmin: player.isAdmin,
                        isBanker: player.isBanker,
                        isActive: player.isActive
                     }
                     return saveMasterPlayer(playerToSave, { updateGames: false });
                }
            }).filter(Boolean);
            
            await Promise.all(savePromises as Promise<MasterPlayer>[]);
            
            const finalMasterPlayers = await getMasterPlayers();
            setMasterPlayers(finalMasterPlayers);

            toast({ title: "Players Saved", description: "Player roles and status have been updated." });
            onOpenChange(false);

        } catch (error) {
            console.error("Failed to save players", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save all player details." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRequest = async (player: MasterPlayer) => {
        if (player.id === currentUser?.id) {
            toast({ variant: "destructive", title: "Action Not Allowed", description: "You cannot delete yourself." });
            return;
        }

        if (player.id.startsWith('new-')) {
            setEditablePlayers(prev => prev.filter(p => p.id !== player.id));
            return;
        }

        const hasHistory = gameHistory.some(game => game.players.some(p => p.name === player.name));

        if (hasHistory) {
            toast({
                variant: 'destructive',
                title: 'Deletion Blocked',
                description: `${player.name} has existing game records. Please use the 'Merge Players' feature to safely handle this player.`,
                duration: 9000,
            });
            return;
        }

        setPlayerToDelete(player);
        setIsSendingOtp(true);
        try {
            const result = await sendDeletePlayerOtp({ 
                playerToDeleteName: player.name,
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
            setPlayerToDelete(null);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const confirmDelete = async () => {
        if (!playerToDelete || otp !== sentOtp) {
            toast({ variant: "destructive", title: "Invalid OTP", description: "The entered OTP is incorrect." });
            return;
        }
        setIsDeleting(true);
        try {
            await deleteMasterPlayer(playerToDelete.id);
            setMasterPlayers(prev => prev.filter(p => p.id !== playerToDelete.id));
            setEditablePlayers(prev => prev.filter(p => p.id !== playerToDelete.id));

            toast({ title: "Player Deleted", description: `${playerToDelete.name} has been removed.` });
            setPlayerToDelete(null);
            setOtp("");
            setSentOtp("");
        } catch (error) {
            console.error("Failed to delete player", error);
            toast({ variant: "destructive", title: "Delete Error", description: "Could not delete player." });
        } finally {
            setIsDeleting(false);
        }
    };

    if (playerToDelete) {
      return (
        <Dialog open={!!playerToDelete} onOpenChange={() => setPlayerToDelete(null)}>
           <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion of {playerToDelete.name}</DialogTitle>
                    <DialogDescription>Enter the OTP sent to the Super Admin's WhatsApp to confirm.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="delete-otp">Admin OTP</Label>
                    <Input id="delete-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="4-digit OTP" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPlayerToDelete(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="animate-spin" /> : "Confirm & Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )
    }

    return (
      <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Master Players</DialogTitle>
                    <DialogDescription>Add new players or manage roles and status. Save all changes at once.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-between items-center mb-4">
                    <Button onClick={addNewPlayerRow} variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" /> Add New Player
                    </Button>
                </div>
                <div className="py-4">
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[100px]">Admin</TableHead>
                                    <TableHead className="w-[100px]">Banker</TableHead>
                                    <TableHead className="w-[100px]">Active</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editablePlayers.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                           { p.id.startsWith('new-') ? (
                                                <Input value={p.name} className="h-8" onChange={e => handleFieldChange(p.id, 'name', e.target.value)} />
                                            ) : (
                                                <Label>{p.name}</Label>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch checked={p.isAdmin} onCheckedChange={checked => handleFieldChange(p.id, 'isAdmin', checked)} />
                                        </TableCell>
                                         <TableCell className="text-center">
                                            <Switch checked={p.isBanker} onCheckedChange={checked => handleFieldChange(p.id, 'isBanker', checked)} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch checked={p.isActive ?? true} onCheckedChange={checked => handleFieldChange(p.id, 'isActive', checked)} />
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" onClick={() => setPlayerToEdit(p)} disabled={p.id.startsWith('new-')} className="h-8 w-8">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => handleDeleteRequest(p)} disabled={isSendingOtp && playerToDelete?.id === p.id} className="h-8 w-8">
                                                {isSendingOtp && playerToDelete?.id === p.id ? <Loader2 className="animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveAll} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Roles & Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <EditPlayerDialog 
            player={playerToEdit}
            onOpenChange={() => setPlayerToEdit(null)}
            onSave={handleSavePlayer}
        />
      </>
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
    return masterPlayers.filter(mp => !gamePlayerNames.includes(mp.name) && (mp.isActive ?? true));
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
                              Confirm & Delete
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
                        {gameHistory.length > 0 ? (
                            gameHistory.map(game => {
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
                                <p className="text-muted-foreground">No game history found.</p>
                                {currentUser?.isAdmin && <Button variant="link" onClick={() => {onOpenChange(false); onNewGame();}}>Start a New Game</Button>}
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

const ReportsDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    onSettleUp: () => void,
}> = ({ isOpen, onOpenChange, activeGame, onSettleUp }) => {
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isBuyInLogExpanded, setIsBuyInLogExpanded] = useState(false);
    const { toast } = useToast();

    const calculatedPlayers = useMemo(() => {
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
    
    const buyInLog = useMemo(() => {
        if (!activeGame) return [];
        return (activeGame.players || [])
            .flatMap(p => (p.buyIns || []).map(b => ({ ...b, playerName: p.name })))
            .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [activeGame]);

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
    
    useEffect(() => {
        if (isOpen) {
            setIsBuyInLogExpanded(buyInLog.length <= 5);
        }
    }, [isOpen, buyInLog.length]);


    const handleExportPdf = async () => {
        if (!reportContentRef.current) return;
        
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportContentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            
            if (!activeGame) throw new Error("Active game is null");
            const venueName = activeGame.venue.replace(/\s/g, '_');
            const gameDate = format(new Date(activeGame.timestamp), "yyyy-MM-dd");
            const playerCount = activeGame.players.length;
            const filename = `${venueName}_${gameDate}_${playerCount}-players.pdf`;
            
            pdf.save(filename);
            toast({ title: "Success", description: "Report has been exported as a PDF." });
        } catch (error) {
            console.error("Failed to export PDF:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "Could not generate the PDF report." });
        } finally {
            setIsExporting(false);
        }
    };

    const logsToShow = isBuyInLogExpanded ? buyInLog : buyInLog.slice(0, 5);

    if (!activeGame) {
        return null;
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md md:max-w-4xl w-full flex flex-col h-full max-h-[95vh]">
                <DialogHeader className="mb-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl sm:text-3xl">Game Report: {activeGame.venue}</DialogTitle>
                        <DialogDescription className="text-base sm:text-lg">{format(new Date(activeGame.timestamp), "dd MMMM yyyy")}</DialogDescription>
                         {activeGame.startTime && (
                            <p className="text-sm text-muted-foreground">
                                Started: {format(new Date(activeGame.startTime), 'p')}
                                {activeGame.endTime && ` - Ended: ${format(new Date(activeGame.endTime), 'p')}`}
                            </p>
                        )}
                    </div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleExportPdf} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="mr-2 h-4 w-4" />}
                             Export PDF
                        </Button>
                        <Button onClick={onSettleUp}>
                            <WhatsappIcon />
                            <span className="ml-2">Settlement</span>
                        </Button>
                        <DialogClose asChild>
                           <Button variant="outline" size="icon"><X /></Button>
                        </DialogClose>
                    </div>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-2 md:-mx-6">
                    <div ref={reportContentRef} className="px-2 md:px-6 py-4 bg-background space-y-6">
                        
                         {/* Player Summary & Accumulative Report */}
                        <Card>
                            <CardHeader><CardTitle>Player Summary</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
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
                                            <TableRow key={p.id} className="text-xs sm:text-sm">
                                                <TableCell className="font-medium px-2 sm:px-4 text-left">{p.name}</TableCell>
                                                <TableCell className="px-2 sm:px-4 text-right">₹{p.totalBuyIns}</TableCell>
                                                <TableCell className="px-2 sm:px-4 text-right">₹{p.finalChips}</TableCell>
                                                <TableCell className={`px-2 sm:px-4 text-right font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{p.profitLoss.toFixed(0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFoot>
                                        <TableRow className="font-bold border-t-2 border-foreground text-xs sm:text-sm">
                                            <TableCell className="px-2 sm:px-4 text-left">Accumulative Report</TableCell>
                                            <TableCell className="px-2 sm:px-4 text-right">₹{grandTotalBuyin}</TableCell>
                                            <TableCell className="px-2 sm:px-4 text-right">₹{grandTotalChips}</TableCell>
                                            <TableCell className={`px-2 sm:px-4 text-right ${grandTotalProfitLoss === 0 ? '' : 'text-destructive'}`}>₹{grandTotalProfitLoss.toFixed(0)}</TableCell>
                                        </TableRow>
                                    </TableFoot>
                                </Table>
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
                                    <div className="h-[250px] sm:h-[300px]">
                                        <ChipDistributionChart data={pieChartData} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        {/* Buy-in Log */}
                        <Card>
                             <CardHeader><CardTitle>Buy-in Log</CardTitle></CardHeader>
                             <CardContent>
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead className="px-2 sm:px-4 text-left">Player</TableHead>
                                             <TableHead className="px-2 sm:px-4 text-right">Amount</TableHead>
                                             <TableHead className="px-2 sm:px-4 text-right">Time</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {logsToShow.map((log) => (
                                             <TableRow key={log.id} className="text-xs sm:text-sm">
                                                 <TableCell className="font-medium px-2 sm:px-4 text-left">{log.playerName}</TableCell>
                                                 <TableCell className="px-2 sm:px-4 text-right">₹{log.amount}</TableCell>
                                                 <TableCell className="px-2 sm:px-4 text-right">{format(new Date(log.timestamp), 'p')}</TableCell>
                                             </TableRow>
                                         ))}
                                     </TableBody>
                                 </Table>
                                 {buyInLog.length > 5 && (
                                     <div className="text-center mt-4">
                                         <Button variant="link" onClick={() => setIsBuyInLogExpanded(!isBuyInLogExpanded)}>
                                             {isBuyInLogExpanded ? 'Show Less' : `Show All ${buyInLog.length} Entries`}
                                         </Button>
                                     </div>
                                 )}
                             </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

const AnomalyReportDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    player: Player | null,
    isLoading: boolean,
    result: { score: number; explanation: string } | null
}> = ({ isOpen, onOpenChange, player, isLoading, result }) => {
    
    const getScoreColor = (score: number) => {
        if (score < 0.3) return "text-green-600";
        if (score < 0.7) return "text-yellow-600";
        return "text-red-600";
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Anomaly Report for {player?.name}</DialogTitle>
                    <DialogDescription>AI-powered analysis of buy-in patterns.</DialogDescription>
                </DialogHeader>
                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Analyzing buy-ins...</p>
                    </div>
                )}
                {result && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Anomaly Score</p>
                            <p className={`text-6xl font-bold ${getScoreColor(result.score)}`}>{(result.score * 100).toFixed(0)}/100</p>
                        </div>
                        <Alert>
                            <ShieldAlert className="h-4 w-4"/>
                            <AlertTitle>AI Explanation</AlertTitle>
                            <AlertDescription>{result.explanation}</AlertDescription>
                        </Alert>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const WhatsappDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappConfig: WhatsappConfig;
  masterPlayers: MasterPlayer[];
}> = ({ isOpen, onOpenChange, whatsappConfig, masterPlayers }) => {
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const playersWithNumbers = useMemo(() => {
    return masterPlayers.filter(p => p.whatsappNumber && p.isActive);
  }, [masterPlayers]);

  const handleSelectPlayer = (number: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedNumbers(prev => [...prev, number]);
    } else {
      setSelectedNumbers(prev => prev.filter(n => n !== number));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedNumbers(playersWithNumbers.map(p => p.whatsappNumber));
    } else {
      setSelectedNumbers([]);
    }
  };

  const handleSend = async () => {
    if (selectedNumbers.length === 0 || !message) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select at least one recipient and enter a message.',
      });
      return;
    }
    setIsSending(true);
    
    try {
      const sendPromises = selectedNumbers.map(number => 
        sendWhatsappMessage({ 
          to: number, 
          message,
          ...whatsappConfig
        })
      );
      
      const results = await Promise.all(sendPromises);
      const successfulSends = results.filter(r => r.success).length;
      const failedSends = results.length - successfulSends;
      
      if (successfulSends > 0) {
        toast({
          title: 'Messages Sent!',
          description: `Successfully sent message to ${successfulSends} recipient(s).`,
        });
      }
      if (failedSends > 0) {
         toast({
          variant: 'destructive',
          title: 'Some Messages Failed',
          description: `Failed to send message to ${failedSends} recipient(s). Check console for details.`,
        });
        results.filter(r => !r.success).forEach(r => console.error(r.error));
      }

      onOpenChange(false);
      setSelectedNumbers([]);
      setMessage('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send messages.';
      toast({
        variant: 'destructive',
        title: 'Error Sending Messages',
        description: errorMessage,
        duration: 9000,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Group WhatsApp Message</DialogTitle>
          <DialogDescription>
            Select players to message. A separate message will be sent to each.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="flex items-center space-x-2 border-b pb-2">
                <Checkbox
                    id="select-all"
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    checked={playersWithNumbers.length > 0 && selectedNumbers.length === playersWithNumbers.length}
                    disabled={playersWithNumbers.length === 0}
                />
                <Label htmlFor="select-all" className="font-medium">Select All</Label>
            </div>
            <ScrollArea className="h-40 border rounded-md p-2">
                {playersWithNumbers.length > 0 ? (
                    playersWithNumbers.map(player => (
                        <div key={player.id} className="flex items-center space-x-2 p-1">
                            <Checkbox 
                                id={`p-${player.id}`} 
                                onCheckedChange={(checked) => handleSelectPlayer(player.whatsappNumber, !!checked)}
                                checked={selectedNumbers.includes(player.whatsappNumber)}
                            />
                            <Label htmlFor={`p-${player.id}`} className="flex-1">{player.name} ({player.whatsappNumber})</Label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">No players with WhatsApp numbers found.</p>
                )}
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your group message here."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={isSending || selectedNumbers.length === 0 || !message}>
            {isSending ? <Loader2 className="animate-spin" /> : `Send to ${selectedNumbers.length} Player(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const WhatsappSettingsDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: WhatsappConfig;
  onSave: (config: WhatsappConfig) => void;
  toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ isOpen, onOpenChange, config, onSave, toast }) => {
  const [currentConfig, setCurrentConfig] = useState(config);

  useEffect(() => {
    setCurrentConfig(config);
  }, [config, isOpen]);

  const handleChange = (field: keyof WhatsappConfig, value: string) => {
    setCurrentConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // In a real app, this might be saved to a secure backend or user profile
    localStorage.setItem('whatsappConfig', JSON.stringify(currentConfig));
    onSave(currentConfig);
    toast({ title: 'Settings Saved', description: 'WhatsApp credentials have been updated for this session.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp API Settings</DialogTitle>
          <DialogDescription>
            Enter your WhatsApp provider credentials here. These are stored locally in your browser.
            You can also set these as ENV variables on the server.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input
              id="apiUrl"
              placeholder="https://api.provider.com/send"
              value={currentConfig.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Your secret API token"
              value={currentConfig.apiToken}
              onChange={(e) => handleChange('apiToken', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderMobile">Sender Mobile</Label>
            <Input
              id="senderMobile"
              placeholder="e.g., 14155552671"
              value={currentConfig.senderMobile}
              onChange={(e) => handleChange('senderMobile', e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ImportGameDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (gameData: { venue: string; timestamp: string; players: Player[] }) => void;
  toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ isOpen, onOpenChange, onImport, toast }) => {
  const [gameLog, setGameLog] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  const exampleLog = `Poker game at "The Den" - 2024-07-25 19:30

Player: Alice
Buy In: 1000
Buy In: 500
Chip Return: 2500

Player: Bob
Buy In: 1000
Chip Return: 500

Player: Charlie
Buy In: 2000
Chip Return: 0`;

  const handleImport = async () => {
    if (!gameLog.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please paste the game log to import.' });
      return;
    }
    setIsImporting(true);
    try {
      const result = await importGameFromText({ gameLog });
      onImport(result);
      toast({ title: 'Success', description: 'Game data has been imported successfully.' });
      setGameLog(''); // Clear text area on success
    } catch (error) {
      console.error('Import failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not parse the game log.';
      toast({ variant: 'destructive', title: 'Import Failed', description: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Game from Text</DialogTitle>
          <div className="flex justify-between items-center">
             <DialogDescription>
                Paste your raw game log below. The AI will parse the players, buy-ins, and final chip counts.
            </DialogDescription>
            <Button variant="outline" size="sm" onClick={() => setShowFormat(!showFormat)}>
                <Info className="mr-2 h-4 w-4" />
                {showFormat ? "Hide Format" : "Show Format"}
            </Button>
          </div>
        </DialogHeader>
        {showFormat && (
            <Alert>
                <AlertTitle>Example Log Format</AlertTitle>
                <AlertDescription>
                    <pre className="mt-2 w-full rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                        <code>{exampleLog}</code>
                    </pre>
                </AlertDescription>
            </Alert>
        )}
        <div className="py-4">
          <Textarea
            placeholder="Paste your game log here..."
            className="h-64"
            value={gameLog}
            onChange={e => setGameLog(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? <Loader2 className="animate-spin" /> : <> <Upload className="mr-2 h-4 w-4" /> Import Game </>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SaveConfirmDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    onConfirmSave: (finalPlayers: CalculatedPlayer[]) => void,
}> = ({ isOpen, onOpenChange, activeGame, onConfirmSave }) => {
    const [localPlayers, setLocalPlayers] = useState<CalculatedPlayer[]>([]);

    const calculatedPlayers = useMemo(() => {
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

    useEffect(() => {
        if (isOpen) {
            // Deep copy to prevent modifying original state directly
            setLocalPlayers(JSON.parse(JSON.stringify(calculatedPlayers)));
        }
    }, [isOpen, calculatedPlayers]);
    
    const handleFinalChipsChange = (playerId: string, newFinalChips: number) => {
        setLocalPlayers(currentPlayers => 
            currentPlayers.map(p => 
                p.id === playerId 
                    ? { ...p, finalChips: newFinalChips, profitLoss: newFinalChips - p.totalBuyIns }
                    : p
            )
        );
    };

    const { totalBuyInsSum, totalFinalChipsSum, totalProfitLossSum, isBalanced } = useMemo(() => {
        if (!localPlayers) return { totalBuyInsSum: 0, totalFinalChipsSum: 0, totalProfitLossSum: 0, isBalanced: false };
        const totalBuyInsSum = localPlayers.reduce((sum, p) => sum + p.totalBuyIns, 0);
        const totalFinalChipsSum = localPlayers.reduce((sum, p) => sum + p.finalChips, 0);
        const totalProfitLossSum = localPlayers.reduce((sum, p) => sum + p.profitLoss, 0);
        const isBalanced = Math.abs(totalBuyInsSum - totalFinalChipsSum) < 0.01;
        return { totalBuyInsSum, totalFinalChipsSum, totalProfitLossSum, isBalanced };
    }, [localPlayers]);
    
    if (!activeGame || activeGame.players.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Confirm Game Details</DialogTitle>
                    <DialogDescription>
                        Review and edit final chip counts below before saving to your history.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative max-h-[60vh] flex flex-col">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead className="text-right">Total Buy-in</TableHead>
                                <TableHead className="w-32 text-right">Final Chips</TableHead>
                                <TableHead className="text-right">Profit/Loss</TableHead>
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableBody>
                                {localPlayers.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-right">{p.totalBuyIns}</TableCell>
                                        <TableCell className="w-32 text-right">
                                            <Input
                                                type="number"
                                                className="h-8 text-right"
                                                value={p.finalChips === 0 ? "" : p.finalChips}
                                                onChange={(e) => handleFinalChipsChange(p.id, parseInt(e.target.value) || 0)}
                                                placeholder="Chips"
                                            />
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {p.profitLoss.toFixed(0)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <Table>
                        <TableFoot className="sticky bottom-0 bg-background z-10">
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell>Totals</TableCell>
                                <TableCell className="text-right">{totalBuyInsSum}</TableCell>
                                <TableCell className="w-32 text-right">{totalFinalChipsSum}</TableCell>
                                <TableCell className="text-right">{totalProfitLossSum.toFixed(0)}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </div>
                {!isBalanced && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Totals Do Not Match!</AlertTitle>
                        <AlertDescription>
                            The total buy-ins ({totalBuyInsSum}) and total final chips ({totalFinalChipsSum}) must be equal. Please correct the values before saving.
                        </AlertDescription>
                    </Alert>
                )}
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={() => onConfirmSave(localPlayers)} disabled={!isBalanced}>
                        <Save className="mr-2 h-4 w-4" />
                        Confirm & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SettlementDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    whatsappConfig: WhatsappConfig,
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void,
}> = ({ isOpen, onOpenChange, activeGame, whatsappConfig, toast }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendingStatus, setSendingStatus] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const playersWithNumbers = useMemo(() => {
        if (!activeGame) return [];
        return activeGame.players.filter(p => p.whatsappNumber);
    }, [activeGame]);
    
    const calculatedPlayers = useMemo(() => {
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
            setSelectedPlayerIds(playersWithNumbers.map(p => p.id));
            setIsSending(false);
            setSendingStatus(null);
            setProgress(0);
        }
    }, [isOpen, playersWithNumbers]);

    const handleSelectPlayer = (playerId: string, isSelected: boolean) => {
        setSelectedPlayerIds(prev => 
            isSelected ? [...prev, playerId] : prev.filter(id => id !== playerId)
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        setSelectedPlayerIds(isChecked ? playersWithNumbers.map(p => p.id) : []);
    };
    
    const formatTransfersForWhatsapp = (game: GameHistory, transfers: string[]): string => {
        const venueLine = `*Venue:* ${game.venue}`;
        const dateLine = `*Date:* ${format(new Date(game.timestamp), "dd MMMM yyyy")}`;
        
        if (transfers.length === 0) {
            return `${venueLine}\n${dateLine}\n\nNo transfers needed. Everyone is settled up!`;
        }
        
        const formattedTransfers = transfers.map(t => t.replace(/<strong>(.*?)<\/strong>/g, '*$1*').replace(/<\/?strong>/g, '*')).join('\n');

        return `${venueLine}\n${dateLine}\n\n\`\`\`
-----------------------
|  Payment Transfers  |
-----------------------
${formattedTransfers}
\`\`\``;
    };

    const handleSend = async () => {
        if (!activeGame || selectedPlayerIds.length === 0) {
            toast({ variant: 'destructive', title: 'No players selected', description: 'Please select at least one player to notify.' });
            return;
        }

        setIsSending(true);
        setProgress(0);
        const playersToSend = playersWithNumbers.filter(p => selectedPlayerIds.includes(p.id));
        const message = formatTransfersForWhatsapp(activeGame, transfers);
        
        const totalToSend = playersToSend.length;
        let successfulSends = 0;
        let failedSends = 0;

        for (let i = 0; i < totalToSend; i++) {
            const player = playersToSend[i];
            setSendingStatus(`Sending to ${player.name} (${i + 1} of ${totalToSend})...`);
            
            try {
                const result = await sendWhatsappMessage({
                    to: player.whatsappNumber,
                    message,
                    ...whatsappConfig
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
            
            setProgress(((i + 1) / totalToSend) * 100);

            // Wait for 30 seconds before sending the next message, unless it's the last one
            if (i < totalToSend - 1) {
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        setSendingStatus(null);
        setIsSending(false);

        if (successfulSends > 0) {
            toast({ title: 'Settlement Sent!', description: `Successfully sent notifications to ${successfulSends} player(s).` });
        }
        if (failedSends > 0) {
            toast({ variant: 'destructive', title: 'Sending Failed', description: `Could not send notifications to ${failedSends} player(s). Check console for details.` });
        }
        
        if (failedSends === 0) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Settlement Details</DialogTitle>
                    <DialogDescription>Select players to notify via WhatsApp. A 30s delay will be applied between messages.</DialogDescription>
                </DialogHeader>
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 border-b pb-2">
                            <Checkbox
                                id="settlement-select-all"
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                checked={playersWithNumbers.length > 0 && selectedPlayerIds.length === playersWithNumbers.length}
                                disabled={playersWithNumbers.length === 0 || isSending}
                            />
                            <Label htmlFor="settlement-select-all" className="font-medium">Select All</Label>
                        </div>
                        <ScrollArea className="h-40 border rounded-md p-2">
                            {playersWithNumbers.length > 0 ? (
                                playersWithNumbers.map(player => (
                                    <div key={player.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox 
                                            id={`settle-${player.id}`} 
                                            onCheckedChange={(checked) => handleSelectPlayer(player.id, !!checked)}
                                            checked={selectedPlayerIds.includes(player.id)}
                                            disabled={isSending}
                                        />
                                        <Label htmlFor={`settle-${player.id}`} className="flex-1">{player.name} ({player.whatsappNumber})</Label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No players with WhatsApp numbers found in this game.</p>
                            )}
                        </ScrollArea>
                    </div>
                    {isSending && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            {sendingStatus && (
                                <div className="flex items-center gap-2 text-sm text-primary">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <p>{sendingStatus}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSending}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSend} disabled={isSending || selectedPlayerIds.length === 0}>
                        {isSending ? <Loader2 className="animate-spin" /> : <> <Send className="mr-2 h-4 w-4" /> Send to {selectedPlayerIds.length} Player(s) </>}
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
                        Approve & Send OTP
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
    
    

