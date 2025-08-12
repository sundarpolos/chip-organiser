
'use server';

import { db } from "@/lib/firebase";
import { GameHistory } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, limit } from "firebase/firestore";

const GAME_HISTORY_COLLECTION = "gameHistory";

export async function getGameHistory(): Promise<GameHistory[]> {
    const q = query(collection(db, GAME_HISTORY_COLLECTION), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const history: GameHistory[] = [];
    querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() } as GameHistory);
    });
    return history;
}

export async function saveGameHistory(game: Partial<GameHistory>): Promise<GameHistory> {
    if (!game.id) {
        throw new Error("Game ID is required to save game history.");
    }
    const docRef = doc(db, GAME_HISTORY_COLLECTION, game.id);
    await setDoc(docRef, game, { merge: true });
    return game as GameHistory;
}

export async function deleteGameHistory(gameId: string): Promise<void> {
    const docRef = doc(db, GAME_HISTORY_COLLECTION, gameId);
    await deleteDoc(docRef);
}
