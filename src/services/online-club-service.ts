
'use server';

import { db } from "@/lib/firebase";
import { OnlinePlayerAccount, OnlineLedgerEntry, MasterPlayer } from "@/lib/types";
import { collection, getDocs, doc, setDoc, addDoc, query, where, getDoc, runTransaction, orderBy, deleteDoc } from "firebase/firestore";

const ONLINE_ACCOUNTS_COLLECTION = "onlinePlayerAccounts";
const ONLINE_LEDGER_COLLECTION = "onlineLedger";

// Get or create a player's online account
export async function getOnlinePlayerAccount(playerId: string): Promise<OnlinePlayerAccount> {
    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, playerId);
    const accountSnap = await getDoc(accountRef);

    if (accountSnap.exists()) {
        return { id: accountSnap.id, ...accountSnap.data() } as OnlinePlayerAccount;
    } else {
        // If account doesn't exist, create it.
        const playerDoc = await getDoc(doc(db, "masterPlayers", playerId));
        if (!playerDoc.exists()) {
            throw new Error("Master player not found, cannot create online account.");
        }
        const playerData = playerDoc.data() as MasterPlayer;
        const newAccount: OnlinePlayerAccount = {
            id: playerId,
            playerId: playerId,
            playerName: playerData.name,
            clubId: playerData.clubId,
            balance: 0,
            lastUpdated: new Date().toISOString(),
        };
        await setDoc(accountRef, newAccount);
        return newAccount;
    }
}

// Get all ledger entries for a player
export async function getOnlineLedgerEntries(accountId: string): Promise<OnlineLedgerEntry[]> {
    const q = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const entries: OnlineLedgerEntry[] = [];
    querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as OnlineLedgerEntry);
    });
    return entries;
}

// Add a new P/L entry and update the account balance
export async function addProfitLoss(accountId: string, amount: number, notes: string, date: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);

        if (!accountDoc.exists()) {
            throw new Error("Player account not found.");
        }

        const currentBalance = accountDoc.data().balance;
        const newBalance = currentBalance + amount;

        const newLedgerEntry: Omit<OnlineLedgerEntry, 'id'> = {
            accountId,
            type: 'p/l',
            amount,
            date,
            notes,
            runningBalance: newBalance,
        };

        const ledgerCollectionRef = collection(db, ONLINE_LEDGER_COLLECTION);
        transaction.add(addDoc(ledgerCollectionRef, newLedgerEntry));

        transaction.update(accountRef, {
            balance: newBalance,
            lastUpdated: new Date().toISOString(),
        });
    });
}

// Update an existing P/L entry
export async function updateProfitLoss(accountId: string, entryId: string, newAmount: number, newNotes: string, newDate: string): Promise<void> {
    const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
    
    await runTransaction(db, async (transaction) => {
        const entryDoc = await transaction.get(entryRef);
        if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
            throw new Error("Ledger entry not found or permission denied.");
        }

        const oldAmount = entryDoc.data().amount;
        const amountDifference = newAmount - oldAmount;

        // Update the account balance
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) {
            throw new Error("Player account not found.");
        }
        const newBalance = accountDoc.data().balance + amountDifference;
        transaction.update(accountRef, { 
            balance: newBalance,
            lastUpdated: new Date().toISOString(),
        });

        // Update the ledger entry itself
        transaction.update(entryRef, {
            amount: newAmount,
            notes: newNotes,
            date: newDate,
        });

        // Adjust subsequent running balances
        const q = query(
            collection(db, ONLINE_LEDGER_COLLECTION),
            where("accountId", "==", accountId),
            where("date", ">", entryDoc.data().date)
        );
        const subsequentDocs = await getDocs(q);
        subsequentDocs.forEach(doc => {
            const newRunningBalance = doc.data().runningBalance + amountDifference;
            transaction.update(doc.ref, { runningBalance: newRunningBalance });
        });
        
        // Update the current entry's running balance too
        transaction.update(entryRef, { runningBalance: entryDoc.data().runningBalance + amountDifference });

    });
}

// Delete a P/L entry
export async function deleteProfitLoss(accountId: string, entryId: string): Promise<void> {
    const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);

    await runTransaction(db, async (transaction) => {
        const entryDoc = await transaction.get(entryRef);
        if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
            throw new Error("Ledger entry not found or permission denied.");
        }

        const deletedAmount = entryDoc.data().amount;

        // Update account balance
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) {
            throw new Error("Player account not found.");
        }
        const newBalance = accountDoc.data().balance - deletedAmount;
        transaction.update(accountRef, {
            balance: newBalance,
            lastUpdated: new Date().toISOString(),
        });
        
        // Adjust subsequent running balances
        const q = query(
            collection(db, ONLINE_LEDGER_COLLECTION),
            where("accountId", "==", accountId),
            where("date", ">", entryDoc.data().date)
        );
        const subsequentDocs = await getDocs(q);
        subsequentDocs.forEach(doc => {
            const newRunningBalance = doc.data().runningBalance - deletedAmount;
            transaction.update(doc.ref, { runningBalance: newRunningBalance });
        });
        
        // Delete the entry
        transaction.delete(entryRef);
    });
}
