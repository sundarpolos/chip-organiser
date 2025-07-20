import { db } from "@/lib/firebase";
import { GameHistory } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, limit } from "firebase/firestore";

const GAME_HISTORY_COLLECTION = "gameHistory";

export async function getGameHistory(): Promise<GameHistory[]> {
    const q = query(collection(db, GAME_HISTORY_COLLECTION), orderBy("timestamp", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const history: GameHistory[] = [];
    querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() } as GameHistory);
    });
    return history;
}

export async function saveGameHistory(game: GameHistory): Promise<GameHistory> {
    const docRef = doc(db, GAME_HISTORY_COLLECTION, game.id);
    await setDoc(docRef, game, { merge: true });
    return game;
}

export async function deleteGameHistory(gameId: string): Promise<void> {
    const docRef = doc(db, GAME_HISTORY_COLLECTION, gameId);
    await deleteDoc(docRef);
}
