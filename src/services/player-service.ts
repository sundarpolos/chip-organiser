
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
        // This is a new player
        const payload: Omit<MasterPlayer, 'id'> = {
            name: 'name' in player ? player.name : '',
            whatsappNumber: 'whatsappNumber' in player ? player.whatsappNumber : '',
            isAdmin: 'isAdmin' in player ? player.isAdmin : false,
            isBanker: 'isBanker' in player ? player.isBanker : false,
            isActive: 'isActive' in player ? player.isActive : true,
            clubId: 'clubId' in player ? player.clubId : '',
        };
        const docRef = await addDoc(collection(db, MASTER_PLAYERS_COLLECTION), payload);
        return { id: docRef.id, ...payload };
    }
}


export async function deleteMasterPlayer(playerId: string): Promise<void> {
    await deleteDoc(doc(db, MASTER_PLAYERS_COLLECTION, playerId));
}
