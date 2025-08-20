
'use server';

import { db } from "@/lib/firebase";
import { MasterVenue } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, writeBatch } from "firebase/firestore";
import { getGameHistory } from "./game-service";

const MASTER_VENUES_COLLECTION = "masterVenues";

export async function getMasterVenues(): Promise<MasterVenue[]> {
    const querySnapshot = await getDocs(collection(db, MASTER_VENUES_COLLECTION));
    const venues: MasterVenue[] = [];
    querySnapshot.forEach((doc) => {
        venues.push({ id: doc.id, ...doc.data() } as MasterVenue);
    });
    return venues;
}

export async function saveMasterVenue(
    venue: Omit<MasterVenue, 'id'> | MasterVenue,
    options: { updateGames: boolean, oldName?: string } = { updateGames: false }
): Promise<MasterVenue> {
    if ('id' in venue) {
        const docRef = doc(db, MASTER_VENUES_COLLECTION, venue.id);
        
        if (options.updateGames && options.oldName && options.oldName !== venue.name) {
            const batch = writeBatch(db);
            const allGames = (await getGameHistory()).filter(g => g.clubId === venue.clubId);
            
            allGames.forEach(game => {
                if (game.venue === options.oldName) {
                    const gameDocRef = doc(db, "gameHistory", game.id);
                    batch.update(gameDocRef, { venue: venue.name });
                }
            });
            await batch.commit();
        }

        const venueToSave = JSON.parse(JSON.stringify(venue));
        await setDoc(docRef, venueToSave, { merge: true });
        return venue;
    } else {
        const docRef = await addDoc(collection(db, MASTER_VENUES_COLLECTION), venue);
        return { id: docRef.id, ...venue };
    }
}


export async function deleteMasterVenue(venueId: string): Promise<void> {
    await deleteDoc(doc(db, MASTER_VENUES_COLLECTION, venueId));
}
