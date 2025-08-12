
'use server';

import { db } from "@/lib/firebase";
import { Club, MasterPlayer } from "@/lib/types";
import { collection, getDocs, doc, setDoc, addDoc, query, where, getDoc, writeBatch, deleteDoc } from "firebase/firestore";

const CLUBS_COLLECTION = "clubs";

export async function getClubs(): Promise<Club[]> {
    const querySnapshot = await getDocs(collection(db, CLUBS_COLLECTION));
    const clubs: Club[] = [];
    querySnapshot.forEach((doc) => {
        clubs.push({ id: doc.id, ...doc.data() } as Club);
    });
    return clubs.sort((a,b) => a.name.localeCompare(b.name));
}

export async function getClub(clubId: string): Promise<Club | null> {
    const docRef = doc(db, CLUBS_COLLECTION, clubId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Club;
    }
    return null;
}


export async function createClub(club: Omit<Club, 'id'>): Promise<Club> {
    const docRef = await addDoc(collection(db, CLUBS_COLLECTION), club);
    return { id: docRef.id, ...club };
}

export async function updateClub(club: Club): Promise<Club> {
    const docRef = doc(db, CLUBS_COLLECTION, club.id);
    await setDoc(docRef, club, { merge: true });
    return club;
}

export async function deleteClub(clubId: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete the club document
    const clubRef = doc(db, CLUBS_COLLECTION, clubId);
    batch.delete(clubRef);

    // Find and delete all players in that club
    const playersQuery = query(collection(db, "masterPlayers"), where("clubId", "==", clubId));
    const playersSnapshot = await getDocs(playersQuery);
    playersSnapshot.forEach(doc => batch.delete(doc.ref));

    // Find and delete all games in that club
    const gamesQuery = query(collection(db, "gameHistory"), where("clubId", "==", clubId));
    const gamesSnapshot = await getDocs(gamesQuery);
    gamesSnapshot.forEach(doc => batch.delete(doc.ref));

    // Find and delete all venues in that club
    const venuesQuery = query(collection(db, "masterVenues"), where("clubId", "==", clubId));
    const venuesSnapshot = await getDocs(venuesQuery);
    venuesSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}


export async function findClubByName(name: string): Promise<Club | null> {
    const q = query(collection(db, CLUBS_COLLECTION), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Club;
    }
    return null;
}
