
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getMasterPlayers } from "./player-service";
import { createClub, findClubByName } from "./club-service";

const SUPER_ADMIN_WHATSAPP = '919843350000';

export async function migrateLegacyData(): Promise<{ message: string }> {
    const batch = writeBatch(db);

    // 1. Find or Create the default "Smart CLUB"
    let club = await findClubByName("Smart CLUB");
    if (!club) {
        const superAdmin = (await getMasterPlayers()).find(p => p.whatsappNumber === SUPER_ADMIN_WHATSAPP);
        if (!superAdmin) {
            throw new Error("Super Admin user not found. Cannot create default club.");
        }
        club = await createClub({ name: "Smart CLUB", ownerId: superAdmin.id });
    }
    const clubId = club.id;

    // 2. Migrate Master Players
    const playersSnapshot = await getDocs(collection(db, "masterPlayers"));
    let playersMigrated = 0;
    playersSnapshot.forEach(playerDoc => {
        const playerData = playerDoc.data();
        if (!playerData.clubId) {
            batch.update(playerDoc.ref, { clubId: clubId });
            playersMigrated++;
        }
    });

    // 3. Migrate Master Venues
    const venuesSnapshot = await getDocs(collection(db, "masterVenues"));
    let venuesMigrated = 0;
    venuesSnapshot.forEach(venueDoc => {
        const venueData = venueDoc.data();
        if (!venueData.clubId) {
            batch.update(venueDoc.ref, { clubId: clubId });
            venuesMigrated++;
        }
    });
    
    // 4. Migrate Game History
    const gamesSnapshot = await getDocs(collection(db, "gameHistory"));
    let gamesMigrated = 0;
    gamesSnapshot.forEach(gameDoc => {
        const gameData = gameDoc.data();
        if (!gameData.clubId) {
            batch.update(gameDoc.ref, { clubId: clubId });
            // Also update players within the game object
            const updatedPlayers = (gameData.players || []).map((p: any) => ({...p, clubId: clubId}));
            batch.update(gameDoc.ref, { players: updatedPlayers });
            gamesMigrated++;
        }
    });

    // Commit all batched writes
    await batch.commit();

    return {
        message: `Successfully migrated ${playersMigrated} players, ${venuesMigrated} venues, and ${gamesMigrated} games to ${club.name}.`
    };
}
