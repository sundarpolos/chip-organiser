'use server';

import { db } from "@/lib/firebase";
import { MasterPlayer } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";

const MASTER_PLAYERS_COLLECTION = "masterPlayers";

export async function getMasterPlayers(): Promise<MasterPlayer[]> {
    const querySnapshot = await getDocs(collection(db, MASTER_PLAYERS_COLLECTION));
    const players: MasterPlayer[] = [];
    querySnapshot.forEach((doc) => {
        players.push({ id: doc.id, ...doc.data() } as MasterPlayer);
    });
    return players;
}

export async function saveMasterPlayer(player: Omit<MasterPlayer, 'id'> | MasterPlayer): Promise<MasterPlayer> {
    if ('id' in player) {
        // This is an update
        const docRef = doc(db, MASTER_PLAYERS_COLLECTION, player.id);
        await setDoc(docRef, player, { merge: true });
        return player;
    } else {
        // This is a new player
        const docRef = await addDoc(collection(db, MASTER_PLAYERS_COLLECTION), player);
        return { id: docRef.id, ...player };
    }
}


export async function deleteMasterPlayer(playerId: string): Promise<void> {
    await deleteDoc(doc(db, MASTER_PLAYERS_COLLECTION, playerId));
}
