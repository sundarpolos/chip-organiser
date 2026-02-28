
'use server';

import { db } from "@/lib/firebase";
import { StakingAgreement, MasterPlayer } from "@/lib/types";
import { collection, getDocs, doc, setDoc, addDoc, query, where, getDoc, orderBy, limit } from "firebase/firestore";

const STAKING_AGREEMENTS_COLLECTION = "stakingAgreements";

export async function createStakingAgreement(agreementData: {
    stakerId: string;
    stakedPlayerId: string;
    percentage: number;
    clubId: string;
}): Promise<StakingAgreement> {
    // Ensure a player doesn't already have an active staker
    const existingAgreement = await getActiveStakingAgreementForPlayer(agreementData.stakedPlayerId);
    if (existingAgreement) {
        throw new Error("This player is already being staked by someone else.");
    }
    
    // Ensure a player isn't staking someone who is already staking them
    const reverseAgreement = await getDocs(query(
        collection(db, STAKING_AGREEMENTS_COLLECTION),
        where("stakerId", "==", agreementData.stakedPlayerId),
        where("stakedPlayerId", "==", agreementData.stakerId),
        where("status", "==", "active")
    ));
    if (!reverseAgreement.empty) {
        throw new Error("You cannot stake a player who is currently staking you.");
    }

    const stakerDoc = await getDoc(doc(db, 'masterPlayers', agreementData.stakerId));
    const stakedPlayerDoc = await getDoc(doc(db, 'masterPlayers', agreementData.stakedPlayerId));

    if (!stakerDoc.exists() || !stakedPlayerDoc.exists()) {
        throw new Error("Staker or staked player not found.");
    }

    const newAgreement: Omit<StakingAgreement, 'id'> = {
        ...agreementData,
        stakerName: (stakerDoc.data() as MasterPlayer).name,
        stakedPlayerName: (stakedPlayerDoc.data() as MasterPlayer).name,
        status: 'active',
        createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, STAKING_AGREEMENTS_COLLECTION), newAgreement);
    return { id: docRef.id, ...newAgreement };
}

export async function cancelStakingAgreement(agreementId: string): Promise<void> {
    const agreementRef = doc(db, STAKING_AGREEMENTS_COLLECTION, agreementId);
    await setDoc(agreementRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
    }, { merge: true });
}

// Gets the active agreement where the given player is being STAKED BY someone
export async function getActiveStakingAgreementForPlayer(stakedPlayerId: string): Promise<StakingAgreement | null> {
    const q = query(
        collection(db, STAKING_AGREEMENTS_COLLECTION),
        where("stakedPlayerId", "==", stakedPlayerId),
        where("status", "==", "active"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as StakingAgreement;
    }
    return null;
}

// Gets agreements related to a player, either where they are the staker or being staked
export async function getAgreementsByPlayer(playerId: string, role: 'staker' | 'stakedPlayer'): Promise<StakingAgreement[]> {
    const field = role === 'staker' ? 'stakerId' : 'stakedPlayerId';
    const q = query(
        collection(db, STAKING_AGREEMENTS_COLLECTION),
        where(field, "==", playerId),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const agreements: StakingAgreement[] = [];
    querySnapshot.forEach(doc => {
        agreements.push({ id: doc.id, ...doc.data() } as StakingAgreement);
    });
    return agreements;
}
