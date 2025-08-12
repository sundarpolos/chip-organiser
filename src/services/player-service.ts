
'use server';

import { db } from "@/lib/firebase";
import { MasterPlayer } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, writeBatch } from "firebase/firestore";
import { getGameHistory } from "./game-service";

const MASTER_PLAYERS_COLLECTION = "masterPlayers";

export async function getMasterPlayers(): Promise<MasterPlayer[]> {
    const querySnapshot = await getDocs(collection(db, MASTER_PLAYERS_COLLECTION));
    const players: MasterPlayer[] = [];
    querySnapshot.forEach((doc) => {
        players.push({ id: doc.id, ...doc.data() } as MasterPlayer);
    });
    return players;
}

export async function saveMasterPlayer(
    player: Omit<MasterPlayer, 'id'> | MasterPlayer,
    options: { updateGames: boolean, oldName?: string } = { updateGames: false }
): Promise<MasterPlayer> {
    
    if ('id' in player && !player.id.startsWith('new-')) {
        // This is an update
        const docRef = doc(db, MASTER_PLAYERS_COLLECTION, player.id);
        
        if (options.updateGames && options.oldName && options.oldName !== player.name) {
            const batch = writeBatch(db);
            // Only update games within the same club
            const allGames = (await getGameHistory()).filter(g => g.clubId === player.clubId);
            
            allGames.forEach(game => {
                let gameWasModified = false;
                const updatedPlayers = game.players.map(p => {
                    if (p.name === options.oldName) {
                        gameWasModified = true;
                        return { ...p, name: player.name };
                    }
                    return p;
                });
                
                if (gameWasModified) {
                    const gameDocRef = doc(db, "gameHistory", game.id);
                    batch.update(gameDocRef, { players: updatedPlayers });
                }
            });
            await batch.commit();
        }

        await setDoc(docRef, player, { merge: true });
        return player;
    } else {
        // This is a new player. The `player` object might have an 'id' property if it's from the UI (e.g., "new-123"),
        // so we destructure to ensure we don't pass that to Firestore.
        const { id, ...newPlayerPayload } = player as MasterPlayer;
        const payload: Omit<MasterPlayer, 'id'> = {
            name: newPlayerPayload.name || '',
            whatsappNumber: newPlayerPayload.whatsappNumber || '',
            isAdmin: newPlayerPayload.isAdmin || false,
            isBanker: newPlayerPayload.isBanker || false,
            isActive: newPlayerPayload.isActive === undefined ? true : newPlayerPayload.isActive,
            clubId: newPlayerPayload.clubId || '',
        };
        const docRef = await addDoc(collection(db, MASTER_PLAYERS_COLLECTION), payload);
        return { id: docRef.id, ...payload };
    }
}


export async function deleteMasterPlayer(playerId: string): Promise<void> {
    await deleteDoc(doc(db, MASTER_PLAYERS_COLLECTION, playerId));
}
