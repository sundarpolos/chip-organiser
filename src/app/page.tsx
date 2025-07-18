
"use client"

import { useState, useEffect, useMemo, useCallback, type FC } from "react"
import { detectAnomalousBuyins } from "@/ai/flows/detect-anomalies"
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message"
import { sendBuyInOtp } from "@/ai/flows/send-buyin-otp"
import type { Player, MasterPlayer, MasterVenue, GameHistory, CalculatedPlayer, BuyIn } from "@/lib/types"
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
  TimerIcon
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, isSameDay, set, intervalToDuration } from "date-fns"
import { ThemeToggle } from "@/components/theme-toggle"
import { config } from 'dotenv';
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"


config();


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

export default function ChipMaestroPage() {
  const { toast } = useToast()

  // Core State
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [currentVenue, setCurrentVenue] = useState<string>("Untitled Game")
  const [isDataReady, setIsDataReady] = useState(false)
  const [gameDate, setGameDate] = useState<Date>(new Date())
  const [isOtpVerificationEnabled, setOtpVerificationEnabled] = useState(true);

  // Master Data State
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([])
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([])
  
  // Game History & Results State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null)
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
  const [gameDuration, setGameDuration] = useState<string>("00:00:00");

  // Modal & Dialog State
  const [isVenueModalOpen, setVenueModalOpen] = useState(false)
  const [isManagePlayersModalOpen, setManagePlayersModalOpen] = useState(false)
  const [isLoadGameModalOpen, setLoadGameModalOpen] = useState(false)
  const [isReportsModalOpen, setReportsModalOpen] = useState(false)
  const [isAnomalyModalOpen, setAnomalyModalOpen] = useState(false)
  const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
  
  // Specific Modal Content State
  const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null)
  const [anomalyPlayer, setAnomalyPlayer] = useState<Player | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<{ score: number; explanation: string } | null>(null);
  const [isAnomalyLoading, setAnomalyLoading] = useState(false);

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedMasterPlayers = localStorage.getItem("masterPlayers")
      const savedMasterVenues = localStorage.getItem("masterVenues")
      const savedGameHistory = localStorage.getItem("gameHistory")
      const savedOtpPreference = localStorage.getItem("isOtpVerificationEnabled");

      if (savedMasterPlayers) setMasterPlayers(JSON.parse(savedMasterPlayers))
      if (savedMasterVenues) setMasterVenues(JSON.parse(savedMasterVenues))
      if (savedGameHistory) {
        const history = JSON.parse(savedGameHistory)
        setGameHistory(history)
      }
      if (savedOtpPreference !== null) {
          setOtpVerificationEnabled(JSON.parse(savedOtpPreference));
      }
      
      const lastActiveGame = localStorage.getItem("activeGame");
      if (lastActiveGame) {
          const game = JSON.parse(lastActiveGame);
          // Don't set activeGame here, let the state update from players/venue/date trigger it
          setCurrentVenue(game.venue);
          setGameDate(new Date(game.timestamp));
          setPlayers(game.players.map((p: CalculatedPlayer) => ({
              id: p.id,
              name: p.name,
              whatsappNumber: p.whatsappNumber,
              buyIns: p.buyIns,
              finalChips: p.finalChips,
          })));
          if (game.startTime) {
              setGameStartTime(new Date(game.startTime));
          }
          if (game.players.length > 0) {
              setActiveTab(game.players[0].id)
          }
      } else {
        setVenueModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error)
      toast({ variant: "destructive", title: "Error", description: "Could not load saved data." })
      setVenueModalOpen(true);
    }
    setIsDataReady(true)
  }, [])


  // Persist master data and game history to localStorage whenever they change
  useEffect(() => {
    if(!isDataReady) return;
    localStorage.setItem("masterPlayers", JSON.stringify(masterPlayers))
    localStorage.setItem("masterVenues", JSON.stringify(masterVenues))
    localStorage.setItem("gameHistory", JSON.stringify(gameHistory))
    localStorage.setItem("isOtpVerificationEnabled", JSON.stringify(isOtpVerificationEnabled));
  }, [masterPlayers, masterVenues, gameHistory, isOtpVerificationEnabled, isDataReady])

  // Game timer effect
  useEffect(() => {
    if (!gameStartTime) {
      setGameDuration("00:00:00");
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
  }, [gameStartTime]);

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
        duration: gameStartTime ? (new Date().getTime() - gameStartTime.getTime()) : undefined
    }
    setActiveGame(currentGame);
  }, [players, currentVenue, gameDate, isDataReady, activeGame?.id, gameStartTime]);

  // This effect saves the activeGame to localStorage whenever it's updated.
  useEffect(() => {
      if (!isDataReady) return;
      if (activeGame) {
          localStorage.setItem("activeGame", JSON.stringify(activeGame));
      } else {
          localStorage.removeItem("activeGame");
      }
  }, [activeGame, isDataReady]);

  const addNewPlayer = () => {
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: "",
      whatsappNumber: "",
      buyIns: [{ amount: 0, timestamp: new Date().toISOString(), verified: !isOtpVerificationEnabled }],
      finalChips: 0,
    }
    setPlayers([...players, newPlayer])
    setActiveTab(newPlayer.id)
  }
  
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
  
  const handlePlayerNameChange = (id: string, newName: string) => {
    const masterPlayer = masterPlayers.find(mp => mp.name === newName);
    const updatedDetails: Partial<Player> = { name: newName };
    if (masterPlayer) {
      updatedDetails.whatsappNumber = masterPlayer.whatsappNumber;
    }
    updatePlayer(id, updatedDetails);
  };
  
  const handleSaveGame = () => {
    if (!activeGame || players.length === 0) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "There is no active game data to save." });
        return;
    }

    if (players.some(p => !p.name)) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "Please ensure all players have a name." });
        return;
    }

    if (players.some(p => (p.buyIns || []).some(b => !b.verified && b.amount > 0))) {
      toast({ variant: "destructive", title: "Unverified Buy-ins", description: "Please verify all buy-ins before saving." });
      return;
    }

    // Check if a game from the same day and venue already exists
    const existingGameIndex = gameHistory.findIndex(
      g => g.venue === activeGame.venue && isSameDay(new Date(g.timestamp), new Date(activeGame.timestamp))
    );

    let updatedHistory;
    if (existingGameIndex !== -1) {
      // Update the existing game
      updatedHistory = [...gameHistory];
      updatedHistory[existingGameIndex] = {...activeGame, id: gameHistory[existingGameIndex].id }; // Retain original ID
      toast({ title: "Game Updated!", description: `${currentVenue} has been updated in your history.` });
    } else {
      // Add a new game
      const newGameToSave = {...activeGame, id: `game-hist-${Date.now()}`}; // Create new ID for history
      updatedHistory = [newGameToSave, ...gameHistory];
      toast({ title: "Game Saved!", description: `${currentVenue} has been saved to your history.` });
    }
    
    setGameHistory(updatedHistory);
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
        buyIns: p.buyIns,
        finalChips: p.finalChips,
      })));
      setGameStartTime(gameToLoad.startTime ? new Date(gameToLoad.startTime) : null);
      if (gameToLoad.players.length > 0) {
        setActiveTab(gameToLoad.players[0].id)
      }
      setLoadGameModalOpen(false);
      toast({ title: "Game Loaded", description: `Loaded game from ${format(new Date(gameToLoad.timestamp), "PPP p")}.` });
    }
  };
  
  const handleNewGame = () => {
    setPlayers([]);
    setActiveGame(null);
    setGameDate(new Date());
    setGameStartTime(null);
    setActiveTab("");
    setVenueModalOpen(true);
  }
  
  const handleStartGameFromVenue = (venue: string, date: Date) => {
    setCurrentVenue(venue);
    setGameDate(date);
    setGameStartTime(new Date());
    setVenueModalOpen(false);
    if (players.length === 0) {
      addNewPlayer();
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

  const transfers = useMemo(() => {
    if (!activeGame) return [];
    return calculateInterPlayerTransfers(activeGame.players);
  }, [activeGame]);

  const totalBuyInLog = useMemo(() => {
    const log = players.flatMap(p => (p.buyIns || []).map(b => ({
      playerName: p.name || "Unnamed",
      amount: b.amount,
      timestamp: b.timestamp,
      verified: b.verified,
    }))).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return log;
  }, [players]);

  const grandTotalBuyIn = useMemo(() => totalBuyInLog.reduce((sum, item) => sum + (item.verified ? item.amount : 0), 0), [totalBuyInLog]);

  if (!isDataReady) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="flex justify-between items-start mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold truncate">{currentVenue}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
                <span>{format(gameDate, "PPP")}</span>
                {gameStartTime && (
                    <div className="flex items-center gap-1">
                        <TimerIcon className="h-4 w-4" />
                        <span>{gameDuration}</span>
                    </div>
                )}
            </div>
          </div>
          <Button onClick={() => setWhatsappModalOpen(true)} variant="outline" size="icon" className="h-8 w-8">
            <WhatsappIcon />
            <span className="sr-only">Send WhatsApp Message</span>
          </Button>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="otp-verification" 
                    checked={isOtpVerificationEnabled} 
                    onCheckedChange={setOtpVerificationEnabled}
                />
                <Label htmlFor="otp-verification" className="text-sm text-muted-foreground">OTP</Label>
            </div>
            <ThemeToggle />
        </div>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
        <section className="md:col-span-2 mb-8 md:mb-0">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button onClick={() => setManagePlayersModalOpen(true)} variant="outline"><BookUser className="mr-2 h-4 w-4" />Manage Players</Button>
                  <Button onClick={handleNewGame} variant="destructive"><Plus className="mr-2 h-4 w-4" />New Game</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {players.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 sm:grid-cols-flow">
                    {players.map(p => (
                      <TabsTrigger key={p.id} value={p.id} className="text-xs p-1 sm:text-sm sm:p-1.5 truncate">{p.name || "New Player"}</TabsTrigger>
                    ))}
                  </TabsList>
                  {players.map(player => (
                    <TabsContent key={player.id} value={player.id}>
                      <PlayerCard 
                        player={player} 
                        masterPlayers={masterPlayers} 
                        onUpdate={updatePlayer}
                        onNameChange={handlePlayerNameChange}
                        onRemove={removePlayer}
                        onRunAnomalyCheck={handleRunAnomalyDetection}
                        allPlayers={players}
                        toast={toast}
                        isOtpEnabled={isOtpVerificationEnabled}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                 <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">No players in the game.</p>
                    <Button onClick={addNewPlayer}><Plus className="mr-2 h-4 w-4"/>Add First Player</Button>
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <Button onClick={addNewPlayer}><Plus className="mr-2 h-4 w-4" />Add Player</Button>
                  <Button onClick={handleSaveGame} variant="secondary"><Save className="mr-2 h-4 w-4" />Save Game</Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setLoadGameModalOpen(true)} variant="outline"><History className="mr-2 h-4 w-4" />Load Game</Button>
                    <Button onClick={() => setReportsModalOpen(true)} variant="outline" disabled={!activeGame}><FileDown className="mr-2 h-4 w-4" />Reports</Button>
                </div>
            </CardFooter>
          </Card>
        </section>
        
        <aside className="md:col-span-1">
          <SummaryCard 
            activeGame={activeGame}
            transfers={transfers}
            buyInLog={totalBuyInLog}
            grandTotal={grandTotalBuyIn}
          />
        </aside>
      </main>

      <VenueDialog 
        isOpen={isVenueModalOpen}
        onOpenChange={setVenueModalOpen}
        masterVenues={masterVenues}
        onStartGame={handleStartGameFromVenue}
        setMasterVenues={setMasterVenues}
        initialDate={gameDate}
      />
      <ManagePlayersDialog 
        isOpen={isManagePlayersModalOpen}
        onOpenChange={setManagePlayersModalOpen}
        masterPlayers={masterPlayers}
        setMasterPlayers={setMasterPlayers}
        toast={toast}
      />
      <LoadGameDialog 
        isOpen={isLoadGameModalOpen}
        onOpenChange={setLoadGameModalOpen}
        gameHistory={gameHistory}
        onLoadGame={handleLoadGame}
      />
      <ReportsDialog 
        isOpen={isReportsModalOpen}
        onOpenChange={setReportsModalOpen}
        activeGame={activeGame}
        transfers={transfers}
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
    onBuyInChange: (index: number, newAmount: number) => void;
    onRemoveBuyIn: (index: number) => void;
    onVerify: (index: number, verified: boolean) => void;
    onAddBuyIn: () => void;
    isOtpEnabled: boolean;
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ buyIn, index, player, canBeRemoved, isLastRow, onBuyInChange, onRemoveBuyIn, onVerify, onAddBuyIn, isOtpEnabled, toast }) => {
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);

    useEffect(() => {
        // If OTP is disabled and the buy-in isn't verified yet, verify it automatically.
        if (!isOtpEnabled && !buyIn.verified && buyIn.amount > 0) {
            onVerify(index, true);
        }
    }, [isOtpEnabled, buyIn.verified, buyIn.amount, index, onVerify]);

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
            onVerify(index, true);
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
            onVerify(index, false); // Re-verification needed if amount changes
        }
        onBuyInChange(index, newAmount);
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
                    disabled={buyIn.verified && isOtpEnabled}
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
                          <AlertDialogAction onClick={() => onRemoveBuyIn(index)}>Continue</AlertDialogAction>
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
  player: Player,
  masterPlayers: MasterPlayer[],
  allPlayers: Player[],
  onUpdate: (id: string, newValues: Partial<Player>) => void,
  onNameChange: (id: string, newName: string) => void,
  onRemove: (id: string) => void,
  onRunAnomalyCheck: (player: Player) => void,
  isOtpEnabled: boolean;
  toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void;
}> = ({ player, masterPlayers, allPlayers, onUpdate, onNameChange, onRemove, onRunAnomalyCheck, isOtpEnabled, toast }) => {
  
  const handleBuyInChange = (index: number, newAmount: number) => {
    const newBuyIns = [...(player.buyIns || [])]
    newBuyIns[index] = {...newBuyIns[index], amount: newAmount}
    onUpdate(player.id, { buyIns: newBuyIns })
  }
  
  const handleVerifyBuyIn = (index: number, verified: boolean) => {
    const newBuyIns = [...(player.buyIns || [])];
    newBuyIns[index] = {...newBuyIns[index], verified };
    onUpdate(player.id, { buyIns: newBuyIns });
  };


  const addBuyIn = () => {
    if ((player.buyIns || []).some(b => !b.verified && b.amount > 0)) {
        toast({ variant: "destructive", title: "Unverified Buy-in", description: "Please verify the current buy-in before adding a new one." });
        return;
    }
    const newBuyIns = [...(player.buyIns || []), { amount: 0, timestamp: new Date().toISOString(), verified: !isOtpEnabled }]
    onUpdate(player.id, { buyIns: newBuyIns })
  }
  
  const removeBuyIn = (index: number) => {
    if ((player.buyIns || []).length > 1) {
      const newBuyIns = (player.buyIns || []).filter((_, i) => i !== index)
      onUpdate(player.id, { buyIns: newBuyIns })
    } else {
        toast({variant: "destructive", title: "Cannot Remove", description: "At least one buy-in is required."})
    }
  }

  const totalBuyIns = (player.buyIns || []).reduce((sum, bi) => sum + (bi.verified ? bi.amount : 0), 0);

  const availableMasterPlayers = useMemo(() => {
    const currentInGamePlayerNames = allPlayers
      .filter(p => p.id !== player.id)
      .map(p => p.name)
      .filter(Boolean);
    return masterPlayers.filter(mp => !currentInGamePlayerNames.includes(mp.name));
  }, [masterPlayers, allPlayers, player.id]);


  return (
    <Card className="bg-slate-50 dark:bg-slate-900/50 border-0 shadow-none">
      <CardHeader className="flex-row items-center justify-between">
        <div className="w-2/3">
          <Select
            value={player.name}
            onValueChange={(newName) => onNameChange(player.id, newName)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Player" />
            </SelectTrigger>
            <SelectContent>
              {player.name && !availableMasterPlayers.some(p => p.name === player.name) && (
                <SelectItem value={player.name}>{player.name}</SelectItem>
              )}
              {availableMasterPlayers.map(mp => (
                <SelectItem key={mp.id} value={mp.name}>{mp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => onRunAnomalyCheck(player)} variant="ghost" size="sm" disabled={!player.name}><ShieldAlert className="h-4 w-4 mr-2" />Analyze</Button>
            {allPlayers.length > 1 && <Button variant="destructive" size="icon" onClick={() => onRemove(player.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="hidden md:inline-block text-lg mb-2">Buy-ins</Label>
          <div className="space-y-2">
             {(player.buyIns || []).map((buyIn, index) => (
              <BuyInRow 
                key={index}
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
                toast={toast}
              />
            ))}
          </div>
          <p className="text-xl font-bold mt-4">{totalBuyIns}</p>
        </div>
        <div>
          <Label className="text-lg">Final Chips</Label>
          <Input 
            type="number" 
            className="mt-2 text-sm h-9" 
            value={player.finalChips === 0 ? "" : player.finalChips}
            onChange={e => onUpdate(player.id, { finalChips: parseInt(e.target.value) || 0 })}
            placeholder="Chip Count"
          />
        </div>
      </CardContent>
    </Card>
  )
}

const SummaryCard: FC<{activeGame: GameHistory | null, transfers: string[], buyInLog: any[], grandTotal: number}> = ({ activeGame, transfers, buyInLog, grandTotal }) => (
    <Card>
        <CardHeader>
            <CardTitle>Game Summary</CardTitle>
            {activeGame && <CardDescription>{format(new Date(activeGame.timestamp), "PPP p")}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
             {!activeGame || activeGame.players.length === 0 ? (
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
                            <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md" dangerouslySetInnerHTML={{ __html: t }} />
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
    setMasterVenues: (venues: MasterVenue[]) => void,
    initialDate: Date
}> = ({ isOpen, onOpenChange, masterVenues, onStartGame, setMasterVenues, initialDate }) => {
    const [newVenue, setNewVenue] = useState("");
    const [selectedVenue, setSelectedVenue] = useState("");
    const [date, setDate] = useState<Date | undefined>(initialDate);

    useEffect(() => {
      if(isOpen) {
        setDate(initialDate)
      }
    }, [isOpen, initialDate])

    const handleSaveNewVenue = () => {
        if (!newVenue.trim()) return;
        const newMasterVenues = [...masterVenues, { id: `venue-${Date.now()}`, name: newVenue.trim() }];
        setMasterVenues(newMasterVenues);
        setSelectedVenue(newVenue.trim());
        setNewVenue("");
    }
    
    const handleDeleteVenue = () => {
        if(!selectedVenue) return;
        const newMasterVenues = masterVenues.filter(v => v.name !== selectedVenue);
        setMasterVenues(newMasterVenues);
        setSelectedVenue("");
    }

    const handleConfirm = () => {
        const venueToStart = selectedVenue || newVenue.trim();
        if (!venueToStart || !date) return;
        if (!masterVenues.some(v => v.name === venueToStart)) {
            const newMasterVenues = [...masterVenues, { id: `venue-${Date.now()}`, name: venueToStart }];
            setMasterVenues(newMasterVenues);
        }
        onStartGame(venueToStart, date);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Set Game Venue & Date</DialogTitle><DialogDescription>Select or create a venue and date to start a new game.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
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
                     <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          className="rounded-md border"
                        />
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
    { value: "+91", label: "IN (+91)" },
    { value: "+1", label: "US (+1)" },
    { value: "+44", label: "UK (+44)" },
    { value: "+61", label: "AU (+61)" },
    { value: "+81", label: "JP (+81)" },
];

const ManagePlayersDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    masterPlayers: MasterPlayer[],
    setMasterPlayers: (players: MasterPlayer[]) => void,
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void,
}> = ({ isOpen, onOpenChange, masterPlayers, setMasterPlayers, toast }) => {
    const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null);
    const [name, setName] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [mobileNumber, setMobileNumber] = useState("");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    const splitPhoneNumber = (fullNumber: string) => {
        if (!fullNumber) return { cc: "+91", num: "" };

        for (const code of countryCodes) {
            if (fullNumber.startsWith(code.value)) {
                return { cc: code.value, num: fullNumber.substring(code.value.length) };
            }
        }
        
        // Fallback for numbers without a known country code
        if (fullNumber.startsWith('+')) {
            const firstSpace = fullNumber.indexOf(' ');
            if (firstSpace > -1) {
                return { cc: fullNumber.substring(0, firstSpace), num: fullNumber.substring(firstSpace + 1) };
            }
        }
        
        // Default if no logic matches
        return { cc: "+91", num: fullNumber.replace("+91", "") };
    };

    useEffect(() => {
        if(editingPlayer) {
            setName(editingPlayer.name);
            const { cc, num } = splitPhoneNumber(editingPlayer.whatsappNumber);
            setCountryCode(cc);
            setMobileNumber(num);
        } else {
            setName("");
            setCountryCode("+91");
            setMobileNumber("");
        }
    }, [editingPlayer]);
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedPlayers([]);
            setEditingPlayer(null);
        }
    }, [isOpen]);

    const handleSave = () => {
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

        if (mobileNumber) {
            const mobileRegex = /^\+?\d{10,14}$/;
            const fullNumberForValidation = `${countryCode}${mobileNumber}`;
            if (!mobileRegex.test(fullNumberForValidation.replace(/\s/g, ''))) {
                 toast({
                     variant: "destructive",
                     title: "Invalid Mobile Number",
                     description: "Please enter a valid mobile number (e.g., +919876543210). It should be 10-14 digits plus an optional country code.",
                 });
                 return;
            }
        }
        
        const fullWhatsappNumber = mobileNumber ? `${countryCode}${mobileNumber}` : "";


        if (editingPlayer) {
            setMasterPlayers(masterPlayers.map(p => p.id === editingPlayer.id ? {...p, name: trimmedName, whatsappNumber: fullWhatsappNumber} : p));
        } else {
            setMasterPlayers([...masterPlayers, {id: `mp-${Date.now()}`, name: trimmedName, whatsappNumber: fullWhatsappNumber}]);
        }
        setEditingPlayer(null);
    }

    const handleSingleRemove = (id: string) => {
        setMasterPlayers(masterPlayers.filter(p => p.id !== id));
    }
    
    const handleMultiRemove = () => {
        setMasterPlayers(masterPlayers.filter(p => !selectedPlayers.includes(p.id)));
        setSelectedPlayers([]);
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
            <DialogContent className="flex flex-col h-[90vh] max-h-[500px]">
                <DialogHeader>
                    <div className="flex items-center justify-center gap-2">
                        <DialogTitle>Manage Players</DialogTitle>
                        <Badge variant="secondary">{masterPlayers.length}</Badge>
                    </div>
                </DialogHeader>
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
                                        />
                                        <div className="grid grid-cols-2 gap-4 flex-1">
                                            <p className="text-sm font-medium truncate col-span-1">{p.name}</p>
                                            <p className="text-xs text-muted-foreground truncate col-span-1">{p.whatsappNumber || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => setEditingPlayer(p)}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleSingleRemove(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
            </DialogContent>
        </Dialog>
    )
}

const LoadGameDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameHistory: GameHistory[];
  onLoadGame: (id: string) => void;
}> = ({ isOpen, onOpenChange, gameHistory, onLoadGame }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());

  const gameDates = useMemo(() => {
    return gameHistory.map(g => new Date(g.timestamp));
  }, [gameHistory]);

  const gamesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return gameHistory.filter(g => isSameDay(new Date(g.timestamp), selectedDate));
  }, [gameHistory, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(undefined);
      setMonth(new Date());
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Previous Game</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ played: gameDates }}
            modifiersClassNames={{
              played: "bg-primary/20 rounded-full",
            }}
            className="rounded-md border"
          />
        </div>

        {selectedDate && (
          <div className="flex-grow mt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">
              Games on {format(selectedDate, "PPP")}
            </h3>
            <ScrollArea className="h-48">
              {gamesOnSelectedDate.length > 0 ? (
                gamesOnSelectedDate.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-2 mb-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <div>
                      <p>{g.venue}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(g.timestamp), "p")}</p>
                    </div>
                    <Button onClick={() => onLoadGame(g.id)}>Load</Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-10">No games found for this date.</p>
              )}
            </ScrollArea>
          </div>
        )}
        
        {gameHistory.length > 0 && !selectedDate && (
            <p className="text-center text-muted-foreground py-4">Select a highlighted date to see games.</p>
        )}

        {gameHistory.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No games in history.</p>
        )}

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
    transfers: string[],
}> = ({ isOpen, onOpenChange, activeGame, transfers }) => {
    
    const handleExportPdf = () => {
        if (!activeGame) return;
        const pdf = new jsPDF();
        pdf.setFontSize(18);
        pdf.text(activeGame.venue, 14, 22);
        pdf.setFontSize(11);
        pdf.text(format(new Date(activeGame.timestamp), "PPP p"), 14, 30);

        autoTable(pdf, {
            startY: 40,
            head: [['Player', 'Buy-ins', 'Final Chips', 'Profit/Loss']],
            body: activeGame.players.map(p => [p.name, p.totalBuyIns, p.finalChips, p.profitLoss]),
        });
        
        const finalY = (pdf as any).lastAutoTable.finalY;
        pdf.setFontSize(14);
        pdf.text("Money Transfers", 14, finalY + 15);
        autoTable(pdf, {
            startY: finalY + 20,
            body: transfers.map(t => [t.replace(/<[^>]*>/g, '')]),
        })

        pdf.save(`${activeGame.venue.replace(/\s/g, '_')}_report.pdf`);
    };

    if (!activeGame) return null;
    
    const pieChartData = activeGame.players
        .filter(p => p.finalChips > 0)
        .map(p => ({ name: p.name, value: p.finalChips, fill: "" }));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
            <ScrollArea className="max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>Game Report: {activeGame.venue}</DialogTitle>
                    <DialogDescription>{format(new Date(activeGame.timestamp), "PPP p")}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                    <Card><CardHeader><CardTitle>Player Performance</CardTitle></CardHeader><CardContent>
                        {activeGame.players.map(p => (
                            <div key={p.id} className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{p.name}</span>
                                    <span className={`font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {p.profitLoss > 0 ? '+' : ''}{p.profitLoss.toFixed(0)} ({p.totalBuyIns > 0 ? ((p.profitLoss / p.totalBuyIns) * 100).toFixed(0) : 'inf'}%)
                                    </span>
                                </div>
                                <Progress value={p.totalBuyIns > 0 ? Math.min(100, Math.abs(p.profitLoss/p.totalBuyIns * 100)) : 100} 
                                className={p.profitLoss >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}/>
                            </div>
                        ))}
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle>Final Chip Distribution</CardTitle></CardHeader><CardContent>
                        <ChipDistributionChart data={pieChartData} />
                    </CardContent></Card>
                     <Card><CardHeader><CardTitle>Money Transfers</CardTitle></CardHeader><CardContent className="space-y-2">
                        {transfers.map((t, i) => (
                            <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm" dangerouslySetInnerHTML={{ __html: t }} />
                        ))}
                    </CardContent></Card>
                     <Card><CardHeader><CardTitle>Game Log</CardTitle></CardHeader><CardContent>
                         <Table><TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Amount</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                         <TableBody>
                             {(activeGame.players.flatMap(p => (p.buyIns || []).map(b => ({...b, playerName: p.name}))).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((b, i) => (
                                 <TableRow key={i}>
                                     <TableCell>{b.playerName}</TableCell>
                                     <TableCell>{b.amount}</TableCell>
                                     <TableCell>{format(new Date(b.timestamp), 'p')}</TableCell>
                                 </TableRow>
                             )))}
                         </TableBody>
                         </Table>
                     </CardContent></Card>
                </div>
                 <DialogFooter className="pr-4 pb-2">
                    <Button onClick={handleExportPdf}><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
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
}> = ({ isOpen, onOpenChange }) => {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!recipient || !message) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a recipient number and a message.',
      });
      return;
    }
    setIsSending(true);
    try {
      const result = await sendWhatsappMessage({ to: recipient, message });
      if (result.success) {
        toast({
          title: 'Message Sent!',
          description: `Successfully sent message to ${recipient}.`,
        });
        onOpenChange(false);
        setRecipient('');
        setMessage('');
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message.';
      toast({
        variant: 'destructive',
        title: 'Error Sending Message',
        description: errorMessage,
        duration: 9000,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test WhatsApp Message</DialogTitle>
          <DialogDescription>
            Use this to test your WhatsApp API credentials.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Number</Label>
            <Input
              id="recipient"
              placeholder="e.g., 919876543210 (with country code)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your test message here."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? <Loader2 className="animate-spin" /> : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
