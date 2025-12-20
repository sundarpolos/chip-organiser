
'use server';

import { db } from "@/lib/firebase";
import { GameHistory } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, limit, addDoc } from "firebase/firestore";

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
    if (game.id && !game.id.startsWith('game-')) {
        const docRef = doc(db, GAME_HISTORY_COLLECTION, game.id);
        await setDoc(docRef, game, { merge: true });
        return game as GameHistory;
    } else {
        // This is a new game, create it
        const newGamePayload = { ...game };
        delete newGamePayload.id;
        const docRef = await addDoc(collection(db, GAME_HISTORY_COLLECTION), newGamePayload);
        return { id: docRef.id, ...newGamePayload } as GameHistory;
    }
}

export async function deleteGameHistory(gameId: string): Promise<void> {
    const docRef = doc(db, GAME_HISTORY_COLLECTION, gameId);
    await deleteDoc(docRef);
}
