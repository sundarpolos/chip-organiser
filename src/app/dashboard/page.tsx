
"use client"

import { useState, useEffect, useMemo, useCallback, useRef, type FC } from "react"
import { useRouter } from 'next/navigation';
import { detectAnomalousBuyins } from "@/ai/flows/detect-anomalies"
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message"
import { sendBuyInOtp } from "@/ai/flows/send-buyin-otp"
import { importGameFromText } from "@/ai/flows/import-game"
import { sendDeletePlayerOtp } from "@/ai/flows/send-delete-player-otp";
import type { Player, MasterPlayer, MasterVenue, GameHistory, CalculatedPlayer, WhatsappConfig, BuyIn } from "@/lib/types"
import { calculateInterPlayerTransfers } from "@/lib/game-logic"
import { ChipDistributionChart } from "@/components/ChipDistributionChart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  Send
} from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { format, isSameDay, set, intervalToDuration } from "date-fns"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, ZAxis } from "recharts"
import { cn } from "@/lib/utils"
import { getGameHistory, saveGameHistory, deleteGameHistory } from "@/services/game-service"
import { getMasterPlayers, saveMasterPlayer, deleteMasterPlayer } from "@/services/player-service"
import { getMasterVenues, saveMasterVenue, deleteMasterVenue } from "@/services/venue-service"
import { db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";


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

const AdminView: FC<{
    players: Player[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    updatePlayer: (id: string, newValues: Partial<Player>) => void;
    removePlayer: (id: string) => void;
    handleRunAnomalyDetection: (player: Player) => void;
    isOtpVerificationEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    isAdmin: boolean;
    setAddPlayerModalOpen: (isOpen: boolean) => void;
    activeGame: GameHistory | null;
    setSaveConfirmOpen: (isOpen: boolean) => void;
    setReportsModalOpen: (isOpen: boolean) => void;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({
    players, activeTab, setActiveTab, updatePlayer, removePlayer, handleRunAnomalyDetection,
    isOtpVerificationEnabled, whatsappConfig, isAdmin, setAddPlayerModalOpen,
    activeGame, setSaveConfirmOpen, setReportsModalOpen, toast
}) => (
    <main className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
        <section className="md:col-span-2 mb-8 md:mb-0">
            <Card>
                <CardContent className="pt-6">
                    {players.length > 0 ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="h-auto flex flex-wrap justify-start -m-1">
                                {players.map((p, index) => (
                                    <TabsTrigger
                                        key={p.id}
                                        value={p.id}
                                        className={cn(
                                            "m-1 truncate text-xs p-1.5 md:text-sm md:p-2.5 data-[state=inactive]:border data-[state=inactive]:border-transparent",
                                            `${tabColors[index % tabColors.length]}`,
                                            "data-[state=active]:ring-2 data-[state=active]:ring-ring"
                                        )}
                                    >
                                        {p.name || "New Player"}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {players.map((player, index) => (
                                <TabsContent key={player.id} value={player.id}>
                                    <PlayerCard
                                        player={player}
                                        onUpdate={updatePlayer}
                                        onRemove={removePlayer}
                                        onRunAnomalyCheck={handleRunAnomalyDetection}
                                        isOtpEnabled={isOtpVerificationEnabled}
                                        whatsappConfig={whatsappConfig}
                                        isAdmin={isAdmin}
                                        colorClass={player.id === activeTab ? tabColors[index % tabColors.length] : ''}
                                        toast={toast}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground mb-4">No players in the game.</p>
                            <Button onClick={() => setAddPlayerModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Players</Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                        <Button onClick={() => setAddPlayerModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />Add Player(s)
                        </Button>
                        {activeGame && <Button onClick={() => setSaveConfirmOpen(true)} variant="secondary" disabled={!activeGame}><Save className="mr-2 h-4 w-4" />Save Game</Button>}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setReportsModalOpen(true)} variant="outline" disabled={!activeGame}><FileDown className="mr-2 h-4 w-4" />Reports</Button>
                    </div>
                </CardFooter>
            </Card>
        </section>
        <SummaryView activeGame={activeGame} />
    </main>
);

const PlayerView: FC<{
    currentUser: MasterPlayer;
    players: Player[];
    updatePlayer: (id: string, newValues: Partial<Player>) => void;
    handleRunAnomalyDetection: (player: Player) => void;
    isOtpVerificationEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    toast: ReturnType<typeof useToast>['toast'];
    activeGame: GameHistory | null;
}> = ({
    currentUser, players, updatePlayer, handleRunAnomalyDetection,
    isOtpVerificationEnabled, whatsappConfig, toast, activeGame
}) => {
    const currentPlayerInGame = useMemo(() => {
        return players.find(p => p.name === currentUser.name)
    }, [players, currentUser]);

    return (
        <main className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
            <section className="md:col-span-2 mb-8 md:mb-0">
                {currentPlayerInGame ? (
                    <PlayerCard
                        player={currentPlayerInGame}
                        onUpdate={updatePlayer}
                        onRemove={() => { }} // Players cannot remove themselves
                        onRunAnomalyCheck={handleRunAnomalyDetection}
                        toast={toast}
                        isOtpEnabled={isOtpVerificationEnabled}
                        whatsappConfig={whatsappConfig}
                        isAdmin={false}
                        colorClass={tabColors[players.findIndex(p => p.id === currentPlayerInGame.id) % tabColors.length]}
                    />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome, {currentUser?.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center py-10">
                            <p className="text-muted-foreground">You are not part of the current game.</p>
                            <p className="text-sm text-muted-foreground">Please wait for the admin to add you.</p>
                        </CardContent>
                    </Card>
                )}
            </section>
            <SummaryView activeGame={activeGame} />
        </main>
    );
};

const SummaryView: FC<{ activeGame: GameHistory | null }> = ({ activeGame }) => {
    const transfers = useMemo(() => {
        if (!activeGame) return [];
        return calculateInterPlayerTransfers(activeGame.players);
    }, [activeGame]);

    const totalBuyInLog = useMemo(() => {
        if (!activeGame) return [];
        return activeGame.players.flatMap(p => (p.buyIns || []).map(b => ({
            playerName: p.name || "Unnamed",
            amount: b.amount,
            timestamp: b.timestamp,
            verified: b.verified,
        }))).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [activeGame]);

    const grandTotalBuyIn = useMemo(() => totalBuyInLog?.reduce((sum, item) => sum + (item.verified ? item.amount : 0), 0), [totalBuyInLog]);

    return (
        <aside className="md:col-span-1">
            <SummaryCard
                activeGame={activeGame}
                transfers={transfers}
                buyInLog={totalBuyInLog}
                grandTotal={grandTotalBuyIn}
            />
        </aside>
    );
};

export default function ChipMaestroPage() {
  const { toast } = useToast()
  const router = useRouter();


  // Core State
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [currentVenue, setCurrentVenue] = useState<string>("Untitled Game")
  const [isDataReady, setIsDataReady] = useState(false)
  const [gameDate, setGameDate] = useState<Date>(new Date())
  const [isOtpVerificationEnabled, setOtpVerificationEnabled] = useState(true);
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [greeting, setGreeting] = useState('');


  // Master Data State
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([])
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([])
  
  // Game History & Results State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null)
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
  const [gameDuration, setGameDuration] = useState<string>("00:00:00");
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null);


  // App Settings
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
    apiUrl: process.env.NEXT_PUBLIC_WHATSAPP_API_URL || '',
    apiToken: process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '',
    senderMobile: process.env.NEXT_PUBLIC_WHATSAPP_SENDER_MOBILE || ''
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

  
  // Specific Modal Content State
  const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null)
  const [anomalyPlayer, setAnomalyPlayer] = useState<Player | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<{ score: number; explanation: string } | null>(null);
  const [isAnomalyLoading, setAnomalyLoading] = useState(false);
  const isAdmin = useMemo(() => currentUser?.isAdmin === true, [currentUser]);


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


  // Load data from Firestore on initial render
  useEffect(() => {
    async function loadInitialData() {
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

            const lastActiveGame = localStorage.getItem("activeGame");
            if (lastActiveGame) {
                const game = JSON.parse(lastActiveGame);
                setCurrentVenue(game.venue);
                setGameDate(new Date(game.timestamp));
                setPlayers(game.players.map((p: CalculatedPlayer) => ({
                    ...p, // Spread existing player data
                    buyIns: (p.buyIns || []).map((b: BuyIn, i: number) => ({
                      ...b,
                      id: b.id || `buyin-legacy-${Date.now()}-${i}`
                    })),
                })));
                if (game.startTime) setGameStartTime(new Date(game.startTime));
                if (game.endTime) setGameEndTime(new Date(game.endTime));
                if (game.players.length > 0) {
                  setActiveTab(game.players[0].id);
                }
            } else if (isAdmin) {
                setVenueModalOpen(true);
            }

        } catch (error) {
            console.error("Failed to load data from Firestore", error);
            toast({ variant: "destructive", title: "Data Loading Error", description: "Could not load data from the cloud. The connection is OK, but a query failed." });
            if (isAdmin) setVenueModalOpen(true); // Open venue dialog to start fresh if data load fails
        } finally {
            setIsDataReady(true);
        }
    }
    if (currentUser) {
        loadInitialData();
    }
  }, [toast, currentUser, isAdmin]);


  // Persist non-firestore data to localStorage whenever they change
  useEffect(() => {
    if(!isDataReady) return;
    localStorage.setItem("isOtpVerificationEnabled", JSON.stringify(isOtpVerificationEnabled));
  }, [isOtpVerificationEnabled, isDataReady])

  // Game timer effect
  useEffect(() => {
    if (!gameStartTime || gameEndTime) {
      if (gameStartTime && gameEndTime) {
          const duration = intervalToDuration({ start: gameStartTime, end: gameEndTime });
          const paddedHours = String(duration.hours || 0).padStart(2, '0');
          const paddedMinutes = String(duration.minutes || 0).padStart(2, '0');
          const paddedSeconds = String(duration.seconds || 0).padStart(2, '0');
          setGameDuration(`${paddedHours}:${paddedMinutes}:${paddedSeconds}`);
      } else {
          setGameDuration("00:00:00");
      }
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
  }, [gameStartTime, gameEndTime]);


  // This effect rebuilds the activeGame object whenever the core game state changes.
  useEffect(() => {
    if (!isDataReady) return;

    if (players.length === 0 && currentVenue === "Untitled Game") {
        setActiveGame(null);
        return;
    }

    const calculatedPlayers: CalculatedPlayer[] = players.map(p => {
        const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.verified ? bi.amount : 0), 0);
        return {
            ...p,
            totalBuyIns,
            profitLoss: p.finalChips - totalBuyIns,
        }
    });

    const now = new Date();
    const finalTimestamp = set(gameDate, { 
      hours: now.getHours(), 
      minutes: now.getMinutes(), 
      seconds: now.getSeconds() 
    }).toISOString();

    const currentGame: GameHistory = {
        id: activeGame?.id || `game-${Date.now()}`,
        venue: currentVenue,
        timestamp: finalTimestamp,
        players: calculatedPlayers,
        startTime: gameStartTime?.toISOString(),
        endTime: gameEndTime?.toISOString(),
        duration: gameStartTime ? ((gameEndTime || new Date()).getTime() - gameStartTime.getTime()) : undefined
    }
    setActiveGame(currentGame);
  }, [players, currentVenue, gameDate, isDataReady, activeGame?.id, gameStartTime, gameEndTime]);

  // This effect saves the activeGame to localStorage whenever it's updated.
  useEffect(() => {
      if (!isDataReady) return;
      if (activeGame) {
          localStorage.setItem("activeGame", JSON.stringify(activeGame));
      } else {
          localStorage.removeItem("activeGame");
      }
  }, [activeGame, isDataReady]);

  const handleLogout = () => {
    localStorage.removeItem('chip-maestro-user');
    localStorage.removeItem('activeGame');
    router.replace('/login');
  };

  const addPlayers = (playersToAdd: MasterPlayer[]) => {
      const newPlayers: Player[] = playersToAdd.map(playerToAdd => ({
          id: `player-${Date.now()}-${playerToAdd.id}`,
          name: playerToAdd.name,
          whatsappNumber: playerToAdd.whatsappNumber,
          buyIns: [{ 
            id: `buyin-${Date.now()}-${playerToAdd.id}`,
            amount: 0, 
            timestamp: new Date().toISOString(), 
            verified: !isOtpVerificationEnabled 
          }],
          finalChips: 0,
      }));
      
      const updatedPlayers = [...players, ...newPlayers];
      setPlayers(updatedPlayers);
      if (activeTab === "" && newPlayers.length > 0) {
          setActiveTab(newPlayers[0].id);
      }
  };

  const removePlayer = (idToRemove: string) => {
    const updatedPlayers = players.filter(p => p.id !== idToRemove)
    setPlayers(updatedPlayers)
    if (activeTab === idToRemove) {
      setActiveTab(updatedPlayers.length > 0 ? updatedPlayers[0].id : "")
    }
  }
  
  const updatePlayer = (id: string, newValues: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...newValues } : p));
  };
  
  const handleSaveGame = async (finalPlayers: CalculatedPlayer[]) => {
    
    if (finalPlayers.length === 0) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "There is no active game data to save." });
        return;
    }

    if (finalPlayers.some(p => !p.name)) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "Please ensure all players have a name." });
        return;
    }

    if (finalPlayers.some(p => (p.buyIns || []).some(b => !b.verified && b.amount > 0))) {
      toast({ variant: "destructive", title: "Unverified Buy-ins", description: "Please verify all buy-ins before saving." });
      return;
    }
    
    const now = new Date();
    const finalTimestamp = set(gameDate, { 
        hours: now.getHours(), 
        minutes: now.getMinutes(), 
        seconds: now.getSeconds() 
    }).toISOString();

    setGameEndTime(now);
    
    const finalGame: GameHistory = {
        id: activeGame?.id || `game-${Date.now()}`,
        venue: currentVenue,
        timestamp: finalTimestamp,
        players: finalPlayers,
        startTime: gameStartTime?.toISOString(),
        endTime: now.toISOString(),
        duration: gameStartTime ? (now.getTime() - gameStartTime.getTime()) : undefined
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
  
  const handleLoadGame = (gameId: string) => {
    const gameToLoad = gameHistory.find(g => g.id === gameId);
    if (gameToLoad) {
      setCurrentVenue(gameToLoad.venue);
      setGameDate(new Date(gameToLoad.timestamp));
      setPlayers(gameToLoad.players.map(p => ({
        id: p.id,
        name: p.name,
        whatsappNumber: p.whatsappNumber,
        buyIns: (p.buyIns || []).map((b, i) => ({
            ...b,
            id: b.id || `buyin-legacy-${Date.now()}-${i}`
        })),
        finalChips: p.finalChips,
      })));
      setGameStartTime(gameToLoad.startTime ? new Date(gameToLoad.startTime) : null);
      setGameEndTime(gameToLoad.endTime ? new Date(gameToLoad.endTime) : null);
      if (gameToLoad.players.length > 0) {
        setActiveTab(gameToLoad.players[0].id)
      }
      setLoadGameModalOpen(false);
      toast({ title: "Game Loaded", description: `Loaded game from ${format(new Date(gameToLoad.timestamp), "dd/MMM/yy")}.` });
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
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
    setPlayers([]);
    setActiveGame(null);
    setGameDate(new Date());
    setGameStartTime(null);
    setGameEndTime(null);
    setActiveTab("");
    setVenueModalOpen(true);
  }
  
  const handleStartGameFromVenue = async (venue: string, date: Date) => {
    if (!masterVenues.some(v => v.name === venue)) {
        const venueData: Omit<MasterVenue, 'id'> = { name: venue };
        const savedVenue = await saveMasterVenue(venueData);
        setMasterVenues(prev => [...prev, savedVenue]);
    }
    
    setCurrentVenue(venue);
    setGameDate(date);
    setGameStartTime(new Date());
    setGameEndTime(null);
    setVenueModalOpen(false);
    if (players.length === 0) {
      setAddPlayerModalOpen(true);
    }
  }

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
            };
            return await saveMasterPlayer(newPlayer);
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

    setCurrentVenue(importedGame.venue);
    const newGameDate = new Date(importedGame.timestamp);
    setGameDate(newGameDate);
    setPlayers(importedGame.players);
    setGameStartTime(newGameDate);
    
    const calculatedPlayers = importedGame.players.map(p => {
        const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.verified ? bi.amount : 0), 0);
        return {
            ...p,
            totalBuyIns,
            profitLoss: p.finalChips - totalBuyIns,
        }
    });

    if (importedGame.players.length > 0) {
        setActiveTab(importedGame.players[0].id);
    }
    
    await handleSaveGame(calculatedPlayers);

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
      <header className="flex justify-between items-start mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold truncate">{currentVenue}</h1>
           {greeting && <p className="text-lg font-semibold text-primary">{greeting}</p>}
           <div className="text-sm text-muted-foreground flex items-center gap-4 mt-2">
            <span>{format(gameDate, "dd MMMM yyyy")}</span>
            {gameStartTime && (
                <div className="flex items-center gap-1">
                    <TimerIcon className="h-4 w-4" />
                    <span>{gameDuration}</span>
                </div>
            )}
           </div>
        </div>
        
        <div className="flex items-center gap-2">
            {isAdmin && <>
                <Button onClick={handleNewGame} variant="destructive"><Plus className="mr-2 h-4 w-4" />New Game</Button>
                <Button onClick={() => setLoadGameModalOpen(true)} variant="outline"><History className="mr-2 h-4 w-4" />Load Game</Button>
            </>}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                    <>
                        <DropdownMenuItem onClick={() => setManagePlayersModalOpen(true)}>
                            <BookUser className="h-4 w-4 mr-2" />
                            Manage Players
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <MessageCircleCode className="h-4 w-4" />
                          <Label htmlFor="otp-verification-toggle" className="ml-2 pr-2 flex-1">OTP Verification</Label>
                          <Switch
                              id="otp-verification-toggle"
                              checked={isOtpVerificationEnabled}
                              onCheckedChange={setOtpVerificationEnabled}
                          />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setImportGameModalOpen(true)}>
                          <Upload className="h-4 w-4" />
                          <span className="ml-2">Import Game</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setWhatsappModalOpen(true)}>
                          <WhatsappIcon />
                          <span className="ml-2">Group Message</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setWhatsappSettingsModalOpen(true)}>
                          <Settings className="h-4 w-4" />
                          <span className="ml-2">WA Settings</span>
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
      
      {isAdmin ? (
          <AdminView
              players={players}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              updatePlayer={updatePlayer}
              removePlayer={removePlayer}
              handleRunAnomalyDetection={handleRunAnomalyDetection}
              isOtpVerificationEnabled={isOtpVerificationEnabled}
              whatsappConfig={whatsappConfig}
              isAdmin={isAdmin}
              setAddPlayerModalOpen={setAddPlayerModalOpen}
              activeGame={activeGame}
              setSaveConfirmOpen={setSaveConfirmOpen}
              setReportsModalOpen={setReportsModalOpen}
              toast={toast}
          />
      ) : (
          <PlayerView
              currentUser={currentUser}
              players={players}
              updatePlayer={updatePlayer}
              handleRunAnomalyDetection={handleRunAnomalyDetection}
              isOtpVerificationEnabled={isOtpVerificationEnabled}
              whatsappConfig={whatsappConfig}
              toast={toast}
              activeGame={activeGame}
          />
      )}

      <VenueDialog 
        isOpen={isVenueModalOpen}
        onOpenChange={setVenueModalOpen}
        masterVenues={masterVenues}
        onStartGame={handleStartGameFromVenue}
        setMasterVenues={setMasterVenues}
        toast={toast}
        initialDate={gameDate}
      />
      <ManagePlayersDialog 
        isOpen={isManagePlayersModalOpen}
        onOpenChange={setManagePlayersModalOpen}
        masterPlayers={masterPlayers}
        setMasterPlayers={setMasterPlayers}
        currentUser={currentUser}
        whatsappConfig={whatsappConfig}
        toast={toast}
      />
       <AddPlayerDialog
        isOpen={isAddPlayerModalOpen}
        onOpenChange={setAddPlayerModalOpen}
        masterPlayers={masterPlayers}
        gamePlayers={players}
        onAddPlayers={addPlayers}
        toast={toast}
      />
      <LoadGameDialog 
        isOpen={isLoadGameModalOpen}
        onOpenChange={setLoadGameModalOpen}
        gameHistory={gameHistory}
        onLoadGame={handleLoadGame}
        onDeleteGame={handleDeleteGame}
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
        players={activeGame?.players || []}
        onConfirmSave={handleSaveGame}
      />
      <SettlementDialog
        isOpen={isSettlementModalOpen}
        onOpenChange={setSettlementModalOpen}
        activeGame={activeGame}
        whatsappConfig={whatsappConfig}
        toast={toast}
      />
    </div>
  )
}

const BuyInRow: FC<{
    buyIn: BuyIn;
    index: number;
    player: Player;
    canBeRemoved: boolean;
    isLastRow: boolean;
    onBuyInChange: (buyInId: string, newAmount: number) => void;
    onRemoveBuyIn: (buyInId: string) => void;
    onVerify: (buyInId: string, verified: boolean) => void;
    onAddBuyIn: () => void;
    isOtpEnabled: boolean;
    whatsappConfig: WhatsappConfig;
    isAdmin: boolean;
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ buyIn, index, player, canBeRemoved, isLastRow, onBuyInChange, onRemoveBuyIn, onVerify, onAddBuyIn, isOtpEnabled, whatsappConfig, isAdmin, toast }) => {
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);

    useEffect(() => {
        // If OTP is disabled and the buy-in isn't verified yet, verify it automatically.
        if (!isOtpEnabled && !buyIn.verified && buyIn.amount > 0) {
            onVerify(buyIn.id, true);
        }
    }, [isOtpEnabled, buyIn.verified, buyIn.amount, buyIn.id, onVerify]);

    const handleSendOtp = async () => {
        if (!player.whatsappNumber) {
            toast({ variant: "destructive", title: "Missing Number", description: "Player's WhatsApp number is required to send OTP." });
            return;
        }
        if (buyIn.amount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Buy-in amount must be greater than zero." });
            return;
        }

        setIsSending(true);
        try {
            const verifiedBuyIns = (player.buyIns || []).filter(b => b.verified);
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
                setShowOtpInput(true);
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
            onVerify(buyIn.id, true);
            setShowOtpInput(false);
        } else {
            toast({ variant: "destructive", title: "Invalid OTP", description: "The entered code is incorrect." });
        }
        setIsVerifying(false);
    };

    const handleAmountChange = (newAmount: number) => {
        if(buyIn.verified) {
            setShowOtpInput(false);
            setSentOtp("");
            setOtp("");
            onVerify(buyIn.id, false); // Re-verification needed if amount changes
        }
        onBuyInChange(buyIn.id, newAmount);
    }
    
    return (
        <div className="p-2 rounded-md border bg-white dark:bg-slate-800 space-y-2">
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    value={buyIn.amount === 0 ? "" : buyIn.amount}
                    onChange={e => handleAmountChange(parseInt(e.target.value) || 0)}
                    placeholder="Amount"
                    className="h-9 text-sm"
                    disabled={!isAdmin}
                />
                {isLastRow && (
                    <Button onClick={onAddBuyIn} variant="outline" size="icon" className="h-9 w-9">
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Re-buy</span>
                    </Button>
                )}
                {buyIn.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                    showOtpInput && isOtpEnabled ? <div className="w-5" /> : null
                )}
                 {canBeRemoved && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="destructive" className="h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this buy-in. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRemoveBuyIn(buyIn.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            {isOtpEnabled && showOtpInput && !buyIn.verified && (
                <div className="flex items-center gap-2">
                    <Input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="4-Digit OTP" className="h-9 text-sm" />
                    <Button onClick={handleConfirmOtp} disabled={isVerifying} className="h-9">
                        {isVerifying ? <Loader2 className="animate-spin" /> : "Confirm"}
                    </Button>
                </div>
            )}
            {isOtpEnabled && !showOtpInput && !buyIn.verified && (
                 <Button onClick={handleSendOtp} disabled={isSending || buyIn.amount <= 0} className="w-full h-9">
                     {isSending ? <Loader2 className="animate-spin" /> : "Verify Buy-in"}
                 </Button>
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
  isAdmin: boolean;
  colorClass: string;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string; }) => void;
}> = ({ player, onUpdate, onRemove, onRunAnomalyCheck, isOtpEnabled, whatsappConfig, isAdmin, colorClass, toast }) => {
  
  const handleBuyInChange = (buyInId: string, newAmount: number) => {
    const newBuyIns = (player.buyIns || []).map(b => 
        b.id === buyInId ? { ...b, amount: newAmount } : b
    );
    onUpdate(player.id, { buyIns: newBuyIns });
  }
  
  const handleVerifyBuyIn = (buyInId: string, verified: boolean) => {
    const newBuyIns = (player.buyIns || []).map(b => 
        b.id === buyInId ? { ...b, verified } : b
    );
    onUpdate(player.id, { buyIns: newBuyIns });
  };


  const addBuyIn = () => {
    if ((player.buyIns || []).some(b => !b.verified && b.amount > 0)) {
        toast({ variant: "destructive", title: "Unverified Buy-in", description: "Please verify the current buy-in before adding a new one." });
        return;
    }
    const newBuyIns = [
        ...(player.buyIns || []), 
        { 
            id: `buyin-${Date.now()}-${Math.random()}`,
            amount: 0, 
            timestamp: new Date().toISOString(), 
            verified: !isOtpEnabled 
        }
    ];
    onUpdate(player.id, { buyIns: newBuyIns })
  }
  
  const removeBuyIn = (buyInId: string) => {
    if ((player.buyIns || []).length > 1) {
      const newBuyIns = (player.buyIns || []).filter((b) => b.id !== buyInId)
      onUpdate(player.id, { buyIns: newBuyIns })
    } else {
        toast({variant: "destructive", title: "Cannot Remove", description: "At least one buy-in is required."})
    }
  }

  const totalBuyIns = (player.buyIns || []).reduce((sum, bi) => sum + (bi.verified ? bi.amount : 0), 0);
  
  return (
    <Card className={cn("border-0 shadow-none", colorClass)}>
       
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-lg mb-2">Buy-ins</Label>
          <div className="space-y-2">
             {(player.buyIns || []).map((buyIn, index) => (
              <BuyInRow 
                key={buyIn.id}
                buyIn={buyIn}
                index={index}
                player={player}
                canBeRemoved={(player.buyIns || []).length > 1}
                isLastRow={index === (player.buyIns || []).length - 1}
                onBuyInChange={handleBuyInChange}
                onRemoveBuyIn={removeBuyIn}
                onVerify={handleVerifyBuyIn}
                onAddBuyIn={addBuyIn}
                isOtpEnabled={isOtpEnabled}
                whatsappConfig={whatsappConfig}
                isAdmin={isAdmin}
                toast={toast}
              />
            ))}
          </div>
        </div>
        <div>
          <Label className="text-lg">Final Chips</Label>
          <Input 
            type="number" 
            className="mt-2 text-sm h-9" 
            value={player.finalChips === 0 ? "" : player.finalChips}
            onChange={e => onUpdate(player.id, { finalChips: parseInt(e.target.value) || 0 })}
            placeholder="Chip Count"
            disabled={!isAdmin}
          />
        </div>
      </CardContent>
      {isAdmin && (
           <CardFooter className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-4">
                <Badge variant="secondary">Total Buy-in: {totalBuyIns}</Badge>
            </div>
            <div className="flex gap-2 items-center">
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => onRunAnomalyCheck(player)} variant="ghost" disabled={!player.name} size="icon">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="sr-only">Analyze Buy-ins</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Analyze Buy-ins</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={() => onRemove(player.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Player</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Remove Player</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </CardFooter>
      )}
    </Card>
  )
}

const SummaryCard: FC<{activeGame: GameHistory | null, transfers: string[], buyInLog: any[], grandTotal: number}> = ({ activeGame, transfers, buyInLog, grandTotal }) => (
    <Card>
        <CardHeader>
            <CardTitle>Game Summary</CardTitle>
            {activeGame && <CardDescription>{format(new Date(activeGame.timestamp), "dd/MMM/yy")}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
             {(!activeGame || activeGame.players.length === 0) ? (
                <div className="text-center py-10 text-muted-foreground">
                    <p>Add players and buy-ins to see the summary.</p>
                </div>
            ) : (
            <>
                <div>
                    <h3 className="font-semibold mb-2">Player Summary</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="p-2">Player</TableHead>
                                <TableHead className="p-2 text-right">Buy-in</TableHead>
                                <TableHead className="p-2 text-right">Chips</TableHead>
                                <TableHead className="p-2 text-right">P/L</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeGame.players.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="p-2 font-medium">{p.name || "Unnamed"}</TableCell>
                                    <TableCell className="p-2 text-right">{p.totalBuyIns}</TableCell>
                                    <TableCell className="p-2 text-right">{p.finalChips}</TableCell>
                                    <TableCell className={`p-2 text-right font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {p.profitLoss.toFixed(0)}
                                    </TableCell>
                                 </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Money Transfers</h3>
                    <div className="space-y-1 text-sm">
                        {transfers.length > 0 ? transfers.map((t, i) => (
                            <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md" dangerouslySetInnerHTML={{ __html: t.replace(/<(\/)?strong>/g, '*') }} />
                        )) : <p className="text-muted-foreground">No transfers needed.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Buy-in Log</h3>
                    <ScrollArea className="h-40">
                    <Table>
                        <TableBody>
                           {buyInLog.map((log, i) => (
                            <TableRow key={i}>
                                <TableCell>{log.playerName}</TableCell>
                                <TableCell>{log.amount}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{format(new Date(log.timestamp), "p")}</TableCell>
                            </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                    </ScrollArea>
                    <Table>
                        <TableFoot>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold">Grand Total</TableCell>
                                <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </div>
            </>
            )}
        </CardContent>
    </Card>
)

const VenueDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    masterVenues: MasterVenue[],
    onStartGame: (venue: string, date: Date) => void,
    setMasterVenues: (venues: MasterVenue[] | ((prev: MasterVenue[]) => MasterVenue[])) => void,
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void,
    initialDate: Date
}> = ({ isOpen, onOpenChange, masterVenues, onStartGame, setMasterVenues, toast, initialDate }) => {
    const [newVenue, setNewVenue] = useState("");
    const [selectedVenue, setSelectedVenue] = useState("");
    const [date, setDate] = useState<Date | undefined>(initialDate);

    useEffect(() => {
      if(isOpen) {
        setDate(initialDate)
        setNewVenue("")
        setSelectedVenue("")
      }
    }, [isOpen, initialDate])

    const handleSaveNewVenue = async () => {
        if (!newVenue.trim()) return;
        const venue: Omit<MasterVenue, 'id'> = { name: newVenue.trim() };
        try {
            const savedVenue = await saveMasterVenue(venue);
            setMasterVenues(prev => [...prev, savedVenue]);
            setSelectedVenue(savedVenue.name);
            setNewVenue("");
            toast({ title: "Venue Saved", description: `${savedVenue.name} has been added to the master list.` });
        } catch (error) {
            console.error("Failed to save new venue:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the new venue." });
        }
    }
    
    const handleDeleteVenue = async () => {
        if(!selectedVenue) return;
        const venueToDelete = masterVenues.find(v => v.name === selectedVenue);
        if (!venueToDelete) return;

        try {
            await deleteMasterVenue(venueToDelete.id);
            setMasterVenues(prev => prev.filter(v => v.id !== venueToDelete.id));
            setSelectedVenue("");
            toast({ title: "Venue Deleted", description: `${selectedVenue} has been deleted.` });
        } catch (error) {
            console.error("Failed to delete venue:", error);
            toast({ variant: "destructive", title: "Delete Error", description: `Could not delete ${selectedVenue}.` });
        }
    }

    const handleConfirm = async () => {
        let venueToStart = selectedVenue || newVenue.trim();
        if (!venueToStart || !date) return;
        
        // If it's a new venue, save it first.
        if (!masterVenues.some(v => v.name === venueToStart)) {
            const venueData: Omit<MasterVenue, 'id'> = { name: venueToStart };
            try {
                const savedVenue = await saveMasterVenue(venueData);
                setMasterVenues(prev => [...prev, savedVenue]);
                venueToStart = savedVenue.name; // Use the saved name
            } catch (error) {
                toast({ variant: "destructive", title: "Save Error", description: "Could not save the new venue before starting." });
                return;
            }
        }
        
        onStartGame(venueToStart, date);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Set Game Venue & Date</DialogTitle><DialogDescription>Select or create a venue and date to start a new game.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Game Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Existing Venues</Label>
                        <div className="flex gap-2">
                        <Select onValueChange={setSelectedVenue} value={selectedVenue}>
                            <SelectTrigger><SelectValue placeholder="-- Select Venue --" /></SelectTrigger>
                            <SelectContent>
                                {masterVenues.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="destructive" onClick={handleDeleteVenue} disabled={!selectedVenue}>Delete</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <Label>Or Enter New Venue</Label>
                        <div className="flex gap-2">
                            <Input value={newVenue} onChange={e => setNewVenue(e.target.value)} placeholder="e.g., John's House"/>
                            <Button onClick={handleSaveNewVenue} disabled={!newVenue.trim()}>Save New</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={(!selectedVenue && !newVenue.trim()) || !date}>Start New Game</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const countryCodes = [
    { value: "91", label: "IN (+91)" },
    { value: "1", label: "US (+1)" },
    { value: "44", label: "UK (+44)" },
    { value: "61", label: "AU (+61)" },
    { value: "81", label: "JP (+81)" },
];

const ManagePlayersDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    masterPlayers: MasterPlayer[];
    setMasterPlayers: (players: MasterPlayer[] | ((prev: MasterPlayer[]) => MasterPlayer[])) => void;
    currentUser: MasterPlayer | null;
    whatsappConfig: WhatsappConfig;
    toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string }) => void;
}> = ({ isOpen, onOpenChange, masterPlayers, setMasterPlayers, currentUser, whatsappConfig, toast }) => {
    const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null);
    const [name, setName] = useState("");
    const [countryCode, setCountryCode] = useState("91");
    const [mobileNumber, setMobileNumber] = useState("");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState<MasterPlayer | null>(null);

    const splitPhoneNumber = (fullNumber: string) => {
        if (!fullNumber) return { cc: "91", num: "" };
        const fullNumberStr = String(fullNumber).replace('+', '');

        for (const code of countryCodes) {
            if (fullNumberStr.startsWith(code.value)) {
                return { cc: code.value, num: fullNumberStr.substring(code.value.length) };
            }
        }
        
        return { cc: "91", num: fullNumberStr };
    };

    useEffect(() => {
        if(editingPlayer) {
            setName(editingPlayer.name);
            const { cc, num } = splitPhoneNumber(editingPlayer.whatsappNumber);
            setCountryCode(cc);
            setMobileNumber(num);
            setIsAdmin(editingPlayer.isAdmin || false);
        } else {
            setName("");
            setCountryCode("91");
            setMobileNumber("");
            setIsAdmin(false);
        }
    }, [editingPlayer]);
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedPlayers([]);
            setEditingPlayer(null);
            setPlayerToDelete(null);
            setOtp("");
            setSentOtp("");
        }
    }, [isOpen]);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Player name cannot be empty." });
            return;
        }

        const isDuplicate = masterPlayers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== editingPlayer?.id);
        if (isDuplicate) {
            toast({ variant: "destructive", title: "Duplicate Player", description: "A player with this name already exists." });
            return;
        }

        const fullWhatsappNumber = mobileNumber ? `${countryCode}${mobileNumber}` : "";

        if (mobileNumber) {
            const mobileRegex = /^\d{10,14}$/;
            if (!mobileRegex.test(fullWhatsappNumber.replace(/\s/g, ''))) {
                 toast({
                     variant: "destructive",
                     title: "Invalid Mobile Number",
                     description: "Please enter a valid mobile number (e.g., 919876543210). It should be 10-14 digits including country code.",
                 });
                 return;
            }
        }
        
        try {
            if (editingPlayer) {
                const updatedPlayer: MasterPlayer = { ...editingPlayer, name: trimmedName, whatsappNumber: fullWhatsappNumber, isAdmin };
                await saveMasterPlayer(updatedPlayer);
                setMasterPlayers(mp => mp.map(p => p.id === editingPlayer.id ? updatedPlayer : p));
                toast({title: "Player Updated", description: "Player details have been saved."});
            } else {
                const newPlayer: Omit<MasterPlayer, 'id'> = { name: trimmedName, whatsappNumber: fullWhatsappNumber, isAdmin };
                const savedPlayer = await saveMasterPlayer(newPlayer);
                setMasterPlayers(mp => [...mp, savedPlayer]);
                toast({title: "Player Added", description: "New player has been added to the list."});
            }
            setEditingPlayer(null);
        } catch (error) {
            console.error("Failed to save player:", error);
            toast({variant: "destructive", title: "Save Error", description: "Could not save player to server."});
        }
    }

    const handleDeleteAttempt = async (player: MasterPlayer) => {
        setPlayerToDelete(player);
        setIsSendingOtp(true);
        try {
            const result = await sendDeletePlayerOtp({
                playerToDeleteName: player.name,
                whatsappConfig: whatsappConfig,
            });
            if (result.success && result.otp) {
                setSentOtp(result.otp);
                toast({ title: "OTP Sent", description: "OTP sent to Super Admin for delete verification." });
            } else {
                throw new Error(result.error || "Failed to send OTP.");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "OTP Error", description: `Could not send verification OTP. ${e.message}` });
            setPlayerToDelete(null);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (otp !== sentOtp || !playerToDelete) {
            toast({ variant: "destructive", title: "Invalid OTP", description: "The entered code is incorrect." });
            return;
        }
        
        setIsVerifyingOtp(true);
        try {
            await deleteMasterPlayer(playerToDelete.id);
            setMasterPlayers(mp => mp.filter(p => p.id !== playerToDelete.id));
            toast({title: "Player Deleted", description: "Player has been removed."});
            setPlayerToDelete(null);
            setOtp("");
            setSentOtp("");
        } catch (error) {
             console.error("Failed to delete player:", error);
             toast({variant: "destructive", title: "Delete Error", description: "Could not delete player from server."});
        } finally {
            setIsVerifyingOtp(false);
        }
    };
    
    const handleMultiRemove = async () => {
        // This feature would also require OTP verification, which is complex for multi-delete.
        // For now, we recommend deleting one by one for security.
        toast({ title: "Action Not Supported", description: "Please delete players one by one for security."});
    }

    const handleSelectPlayer = (id: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedPlayers(prev => [...prev, id]);
        } else {
            setSelectedPlayers(prev => prev.filter(playerId => playerId !== id));
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col h-[90vh] max-h-[700px]">
                <DialogHeader>
                    <div className="flex items-center justify-center gap-2">
                        <DialogTitle>Manage Players</DialogTitle>
                        <Badge variant="secondary">{masterPlayers.length}</Badge>
                    </div>
                </DialogHeader>
                {!playerToDelete ? (
                <>
                <div className="space-y-2 border-b pb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Player Name" value={name} onChange={e => setName(e.target.value)} className="col-span-2" />
                         <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {countryCodes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input placeholder="10-digit mobile" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="admin-switch" checked={isAdmin} onCheckedChange={setIsAdmin} disabled={editingPlayer?.id === currentUser?.id || editingPlayer?.whatsappNumber === '919843350000'} />
                        <Label htmlFor="admin-switch">Make this player an Admin</Label>
                    </div>
                    <Button onClick={handleSave} className="w-full">{editingPlayer ? 'Save Changes' : 'Add to List'}</Button>
                    {editingPlayer && <Button variant="ghost" className="w-full" onClick={() => setEditingPlayer(null)}>Cancel Edit</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="space-y-2 py-4 pr-6">
                            {masterPlayers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                                    <div className="flex items-center gap-3 flex-1 mr-4">
                                        <Checkbox 
                                            id={`select-${p.id}`}
                                            checked={selectedPlayers.includes(p.id)}
                                            onCheckedChange={(checked) => handleSelectPlayer(p.id, !!checked)}
                                            disabled={p.id === currentUser?.id}
                                        />
                                        <div className="grid grid-cols-2 gap-4 flex-1">
                                            <div className="text-sm font-medium truncate col-span-1 flex items-center gap-1.5">
                                                {p.name} {p.isAdmin && <UserCog className="h-3 w-3 text-primary"/>}
                                                {p.whatsappNumber === '919843350000' && <Crown className="h-3 w-3 text-amber-500" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate col-span-1">{p.whatsappNumber || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => setEditingPlayer(p)}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleDeleteAttempt(p)} disabled={p.id === currentUser?.id || isSendingOtp}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="pt-4 border-t flex justify-between">
                    {selectedPlayers.length > 0 ? (
                        <Button variant="destructive" onClick={handleMultiRemove}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedPlayers.length})
                        </Button>
                    ) : <div></div>}
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
                </>
                ) : (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h3 className="text-lg font-semibold text-center">Confirm Deletion of "{playerToDelete.name}"</h3>
                    <p className="text-sm text-muted-foreground text-center">An OTP has been sent to the Super Admin. Please enter it below to confirm this permanent action.</p>
                    <div className="w-full space-y-2">
                         <Label htmlFor="delete-otp">Verification OTP</Label>
                         <Input id="delete-otp" type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="4-Digit OTP" className="text-center" />
                    </div>
                    <div className="w-full flex flex-col gap-2">
                        <Button onClick={handleConfirmDelete} disabled={isVerifyingOtp}>
                            {isVerifyingOtp ? <Loader2 className="animate-spin" /> : "Confirm & Delete Player"}
                        </Button>
                        <Button variant="outline" onClick={() => setPlayerToDelete(null)}>Cancel</Button>
                    </div>
                </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

const AddPlayerDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  masterPlayers: MasterPlayer[];
  gamePlayers: Player[];
  onAddPlayers: (players: MasterPlayer[]) => void;
  toast: (options: { variant?: 'default' | 'destructive' | null; title: string; description: string }) => void;
}> = ({ isOpen, onOpenChange, masterPlayers, gamePlayers, onAddPlayers, toast }) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const availablePlayers = useMemo(() => {
    const gamePlayerNames = gamePlayers.map(p => p.name);
    return masterPlayers.filter(mp => !gamePlayerNames.includes(mp.name));
  }, [masterPlayers, gamePlayers]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlayerIds([]);
    }
  }, [isOpen]);

  const handleSelectPlayer = (playerId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayerIds(prev => [...prev, playerId]);
    } else {
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
    }
  };

  const handleConfirmAdd = () => {
    if (selectedPlayerIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Players Selected',
        description: 'Please select at least one player to add.',
      });
      return;
    }
    const playersToAdd = masterPlayers.filter(mp => selectedPlayerIds.includes(mp.id));
    onAddPlayers(playersToAdd);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Players to Game</DialogTitle>
          <DialogDescription>Select players from your master list to add to the current game.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {availablePlayers.length > 0 ? (
            <ScrollArea className="h-60 border rounded-md p-2">
              <div className="space-y-2">
                {availablePlayers.map(player => (
                  <div key={player.id} className="flex items-center space-x-3 p-1">
                    <Checkbox
                      id={`add-${player.id}`}
                      checked={selectedPlayerIds.includes(player.id)}
                      onCheckedChange={(checked) => handleSelectPlayer(player.id, !!checked)}
                    />
                    <Label htmlFor={`add-${player.id}`} className="flex-1 cursor-pointer">
                      {player.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <p>All master players are already in the game.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirmAdd} disabled={selectedPlayerIds.length === 0}>
            Add {selectedPlayerIds.length > 0 ? selectedPlayerIds.length : ''} Player(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const LoadGameDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameHistory: GameHistory[];
  onLoadGame: (id: string) => void;
  onDeleteGame: (id: string) => void;
}> = ({ isOpen, onOpenChange, gameHistory, onLoadGame, onDeleteGame }) => {
  const sortedHistory = useMemo(
    () => [...gameHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [gameHistory]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Load Previous Game</DialogTitle>
          <DialogDescription>Select a game from your history to load or delete.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ScrollArea className="h-72">
            {sortedHistory.length > 0 ? (
              <div className="space-y-2 pr-4">
                {sortedHistory.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2">
                    <div>
                      <p className="font-semibold">{g.venue}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(g.timestamp), "PPP, p")}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => onLoadGame(g.id)} size="sm">
                            Load
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-9 w-9">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the game from <strong>{g.venue}</strong> on {format(new Date(g.timestamp), "PPP")}. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteGame(g.id)}>
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No games in history.</p>
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    
    const transfers = useMemo(() => {
        if (!activeGame) return [];
        return calculateInterPlayerTransfers(activeGame.players);
    }, [activeGame]);
    
    const handleExportPdf = async () => {
        if (!activeGame || !reportContentRef.current) return;
        
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

    if (!activeGame) return null;
    
    const { players } = activeGame;

    const pieChartData = players
        .filter(p => p.finalChips > 0)
        .map(p => ({ name: p.name, value: p.finalChips }));

    const barChartData = players.map(p => ({
        name: p.name,
        'P/L': p.profitLoss
    }));

    const sortedStandings = [...players].sort((a, b) => b.profitLoss - a.profitLoss);
    const totalBuyIns = players.reduce((sum, p) => sum + p.totalBuyIns, 0);
    const totalChips = players.reduce((sum, p) => sum + p.finalChips, 0);
    const totalPL = players.reduce((sum, p) => sum + p.profitLoss, 0);
    

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader className="mb-4 flex-row items-start justify-between">
                    <div className="space-y-1">
                        <DialogTitle className="text-3xl">Game Report: {activeGame.venue}</DialogTitle>
                        <DialogDescription className="text-lg">{format(new Date(activeGame.timestamp), "dd MMMM yyyy")}</DialogDescription>
                         {activeGame.startTime && (
                            <p className="text-sm text-muted-foreground">
                                Started: {format(new Date(activeGame.startTime), 'p')}
                                {activeGame.endTime && ` - Ended: ${format(new Date(activeGame.endTime), 'p')}`}
                            </p>
                        )}
                    </div>
                     <div className="flex items-center gap-2">
                        <Button onClick={handleExportPdf} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                             <span className="ml-2">Export PDF</span>
                        </Button>
                        <Button onClick={onSettleUp}>
                            <WhatsappIcon />
                            <span className="ml-2">Settlement</span>
                        </Button>
                        <DialogClose asChild>
                           <Button variant="outline">Close</Button>
                        </DialogClose>
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(85vh-80px)] pr-6">
                    <div ref={reportContentRef} className="p-4 bg-background">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            <Card className="lg:col-span-2"><CardHeader><CardTitle>Final Standings</CardTitle></CardHeader><CardContent>
                                 <Table><TableHeader><TableRow>
                                     <TableHead>Player</TableHead>
                                     <TableHead className="text-right">Buy-in</TableHead>
                                     <TableHead className="text-right">Chip Return</TableHead>
                                     <TableHead className="text-right">P/L</TableHead>
                                 </TableRow></TableHeader>
                                 <TableBody>
                                     {sortedStandings.map((p) => (
                                         <TableRow key={p.id}>
                                             <TableCell className="font-medium">{p.name}</TableCell>
                                             <TableCell className="text-right">{p.totalBuyIns}</TableCell>
                                             <TableCell className="text-right">{p.finalChips}</TableCell>
                                             <TableCell className={`text-right font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{p.profitLoss.toFixed(0)}</TableCell>
                                         </TableRow>
                                     ))}
                                 </TableBody>
                                 <TableFoot>
                                    <TableRow className="font-bold border-t-2 border-foreground">
                                        <TableCell>Grand Totals</TableCell>
                                        <TableCell className="text-right">{totalBuyIns}</TableCell>
                                        <TableCell className="text-right">{totalChips}</TableCell>
                                        <TableCell className="text-right">{totalPL.toFixed(0)}</TableCell>
                                    </TableRow>
                                 </TableFoot>
                                 </Table>
                             </CardContent></Card>

                             <Card><CardHeader><CardTitle>Money Transfers</CardTitle></CardHeader><CardContent className="space-y-2">
                                {transfers.length > 0 ? transfers.map((t, i) => (
                                    <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm" dangerouslySetInnerHTML={{ __html: t }} />
                                )) : <p className="text-muted-foreground text-sm">No transfers needed.</p>}
                            </CardContent></Card>
                            
                            <Card className="md:col-span-2 lg:col-span-3"><CardHeader><CardTitle>Player Performance (Profit/Loss)</CardTitle></CardHeader><CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                        <YAxis />
                                        <RechartsTooltip
                                            content={({ payload }) => {
                                                if (!payload || !payload.length) return null;
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-background border p-2 rounded-md shadow-lg">
                                                        <p className="font-bold">{data.name}</p>
                                                        <p className={data['P/L'] >= 0 ? 'text-green-600' : 'text-red-600'}>P/L: {data['P/L'].toFixed(0)}</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="P/L" name="Profit/Loss">
                                        {barChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry['P/L'] >= 0 ? '#10b981' : '#ef4444'} />
                                        ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent></Card>

                            <Card><CardHeader><CardTitle>Final Chip Distribution</CardTitle></CardHeader><CardContent>
                                <ChipDistributionChart data={pieChartData} />
                            </CardContent></Card>
                        </div>
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
    return masterPlayers.filter(p => p.whatsappNumber);
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
      <DialogContent className="max-w-md">
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
          <DialogDescription>
            Paste your raw game log below. The AI will parse the players, buy-ins, and final chip counts.
          </DialogDescription>
        </DialogHeader>
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
    players: CalculatedPlayer[],
    onConfirmSave: (finalPlayers: CalculatedPlayer[]) => void,
}> = ({ isOpen, onOpenChange, players, onConfirmSave }) => {
    const [localPlayers, setLocalPlayers] = useState<CalculatedPlayer[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Deep copy to prevent modifying original state directly
            setLocalPlayers(JSON.parse(JSON.stringify(players)));
        }
    }, [isOpen, players]);
    
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
    
    if (!players || players.length === 0) return null;

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

    const transfers = useMemo(() => {
        if (!activeGame) return [];
        return calculateInterPlayerTransfers(activeGame.players);
    }, [activeGame]);

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
        
        const formattedTransfers = transfers.map(t => t.replace(/<strong>(.*?)<\/strong>/g, '*$1*')).join('\n');

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
