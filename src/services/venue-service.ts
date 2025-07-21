'use server';

import { db } from "@/lib/firebase";
import { MasterVenue } from "@/lib/types";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";

const MASTER_VENUES_COLLECTION = "masterVenues";

export async function getMasterVenues(): Promise<MasterVenue[]> {
    const querySnapshot = await getDocs(collection(db, MASTER_VENUES_COLLECTION));
    const venues: MasterVenue[] = [];
    querySnapshot.forEach((doc) => {
        venues.push({ id: doc.id, ...doc.data() } as MasterVenue);
    });
    return venues;
}

export async function saveMasterVenue(venue: Omit<MasterVenue, 'id'> | MasterVenue): Promise<MasterVenue> {
    if ('id' in venue) {
        // This is an update
        const docRef = doc(db, MASTER_VENUES_COLLECTION, venue.id);
        await setDoc(docRef, venue, { merge: true });
        return venue;
    } else {
        // This is a new venue
        const docRef = await addDoc(collection(db, MASTER_VENUES_COLLECTION), venue);
        return { id: docRef.id, ...venue };
    }
}

export async function deleteMasterVenue(venueId: string): Promise<void> {
    await deleteDoc(doc(db, MASTER_VENUES_COLLECTION, venueId));
}
