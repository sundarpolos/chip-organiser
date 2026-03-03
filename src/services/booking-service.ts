

'use server';

import { db } from "@/lib/firebase";
import { ScheduledGame, SeatBooking } from "@/lib/types";
import { collection, getDocs, doc, setDoc, addDoc, query, where, deleteDoc, getDoc } from "firebase/firestore";

const SCHEDULED_GAMES_COLLECTION = "scheduledGames";
const SEAT_BOOKINGS_COLLECTION = "seatBookings";

// == Scheduled Game Functions ==

export async function createScheduledGame(game: Omit<ScheduledGame, 'id' | 'createdAt'>): Promise<ScheduledGame> {
    const newGame: Omit<ScheduledGame, 'id'> = {
        ...game,
        createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, SCHEDULED_GAMES_COLLECTION), newGame);
    return { id: docRef.id, ...newGame };
}

export async function getScheduledGame(gameId: string): Promise<ScheduledGame | null> {
    const docRef = doc(db, SCHEDULED_GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ScheduledGame;
    }
    return null;
}

export async function getScheduledGamesForClub(clubId: string): Promise<ScheduledGame[]> {
    const q = query(collection(db, SCHEDULED_GAMES_COLLECTION), where("clubId", "==", clubId));
    const querySnapshot = await getDocs(q);
    const games: ScheduledGame[] = [];
    querySnapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() } as ScheduledGame);
    });
    return games.sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
}

export async function deleteScheduledGame(gameId: string): Promise<void> {
    // Also delete all bookings for this game
    const bookingsQuery = query(collection(db, SEAT_BOOKINGS_COLLECTION), where("scheduledGameId", "==", gameId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const deletePromises = bookingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, SCHEDULED_GAMES_COLLECTION, gameId));
}

// == Seat Booking Functions ==

export async function createSeatBooking(booking: Omit<SeatBooking, 'id' | 'bookedAt'>): Promise<SeatBooking> {
    const newBooking: Omit<SeatBooking, 'id'> = {
        ...booking,
        bookedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, SEAT_BOOKINGS_COLLECTION), newBooking);
    return { id: docRef.id, ...newBooking };
}

export async function getSeatBookingsForGame(scheduledGameId: string): Promise<SeatBooking[]> {
    const q = query(collection(db, SEAT_BOOKINGS_COLLECTION), where("scheduledGameId", "==", scheduledGameId));
    const querySnapshot = await getDocs(q);
    const bookings: SeatBooking[] = [];
    querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() } as SeatBooking);
    });
    return bookings.sort((a, b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime());
}

export async function updateSeatBooking(bookingId: string, updates: Partial<SeatBooking>): Promise<void> {
    const docRef = doc(db, SEAT_BOOKINGS_COLLECTION, bookingId);
    await setDoc(docRef, updates, { merge: true });
}

export async function getPlayerBookingForGame(playerId: string, scheduledGameId: string): Promise<SeatBooking | null> {
    const q = query(
        collection(db, SEAT_BOOKINGS_COLLECTION), 
        where("playerId", "==", playerId),
        where("scheduledGameId", "==", scheduledGameId)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as SeatBooking;
    }
    return null;
}

export async function cancelSeatBooking(bookingId: string): Promise<void> {
    await deleteDoc(doc(db, SEAT_BOOKINGS_COLLECTION, bookingId));
}

