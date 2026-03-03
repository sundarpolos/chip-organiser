

'use server';

import { db } from "@/lib/firebase";
import { OnlinePlayerAccount, OnlineLedgerEntry, MasterPlayer, OnlineClub } from "@/lib/types";
import { collection, getDocs, doc, setDoc, addDoc, query, where, getDoc, runTransaction, orderBy, deleteDoc, limit, writeBatch } from "firebase/firestore";

const ONLINE_ACCOUNTS_COLLECTION = "onlinePlayerAccounts";
const ONLINE_LEDGER_COLLECTION = "onlineLedger";
const ONLINE_CLUBS_COLLECTION = "onlineClubs";

// ====== ACCOUNT FUNCTIONS ======

export async function getOnlinePlayerAccount(playerId: string): Promise<OnlinePlayerAccount> {
    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, playerId);
    const accountSnap = await getDoc(accountRef);

    if (accountSnap.exists()) {
        return { id: accountSnap.id, ...accountSnap.data() } as OnlinePlayerAccount;
    } else {
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

export async function getOnlinePlayerAccounts(clubId?: string): Promise<OnlinePlayerAccount[]> {
    const q = clubId
        ? query(collection(db, ONLINE_ACCOUNTS_COLLECTION), where("clubId", "==", clubId))
        : collection(db, ONLINE_ACCOUNTS_COLLECTION);
    
    const querySnapshot = await getDocs(q);
    const accounts: OnlinePlayerAccount[] = [];
    querySnapshot.forEach((doc) => {
        accounts.push({ id: doc.id, ...doc.data() } as OnlinePlayerAccount);
    });
    return accounts.sort((a,b) => a.playerName.localeCompare(b.name));
}


// ====== LEDGER FUNCTIONS ======

export async function getOnlineLedgerEntries(accountId: string): Promise<OnlineLedgerEntry[]> {
    const q = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId));
    const querySnapshot = await getDocs(q);
    const entries: OnlineLedgerEntry[] = [];
    querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as OnlineLedgerEntry);
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addProfitLoss(accountId: string, amount: number, notes: string, date: string, onlineClubName: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);

        if (!accountDoc.exists()) {
             throw new Error("Player account does not exist.");
        }
        const playerAccount = accountDoc.data() as OnlinePlayerAccount;

        const newBalance = playerAccount.balance + amount;
        transaction.update(accountRef, { balance: newBalance, lastUpdated: new Date().toISOString() });
        
        const newLedgerEntry: Omit<OnlineLedgerEntry, 'id'> = {
            accountId, type: 'p/l', amount, date, notes, onlineClubName, runningBalance: newBalance
        };
        const newLedgerRef = doc(collection(db, ONLINE_LEDGER_COLLECTION));
        transaction.set(newLedgerRef, newLedgerEntry);
    });
}


export async function recordTransaction(accountId: string, type: 'deposit' | 'withdrawal', amount: number, notes: string): Promise<void> {
    const transactionAmount = type === 'deposit' ? amount : -amount;

    await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);

        if (!accountDoc.exists()) {
            throw new Error("Player account not found.");
        }

        const currentBalance = accountDoc.data().balance;
        const newBalance = currentBalance + transactionAmount;

        const newLedgerEntry: Omit<OnlineLedgerEntry, 'id'> = {
            accountId,
            type,
            amount: transactionAmount,
            date: new Date().toISOString(),
            notes,
            runningBalance: newBalance,
        };

        const newLedgerDocRef = doc(collection(db, ONLINE_LEDGER_COLLECTION));
        transaction.set(newLedgerDocRef, newLedgerEntry);
        
        transaction.update(accountRef, {
            balance: newBalance,
            lastUpdated: new Date().toISOString(),
        });
    });
}

async function recalculateLedger(transaction: any, accountId: string, fromDate?: string) {
    const entriesQuery = fromDate
        ? query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId), where("date", ">=", fromDate), orderBy("date", "asc"))
        : query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId), orderBy("date", "asc"));
    
    const entriesSnapshot = await transaction.get(entriesQuery);

    let previousBalance = 0;
    if (fromDate) {
        const previousEntryQuery = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId), where("date", "<", fromDate), orderBy("date", "desc"), limit(1));
        const previousEntrySnapshot = await transaction.get(previousEntryQuery);
        if (!previousEntrySnapshot.empty) {
            previousBalance = previousEntrySnapshot.docs[0].data().runningBalance;
        }
    }

    let currentBalance = previousBalance;
    for (const doc of entriesSnapshot.docs) {
        currentBalance += doc.data().amount;
        transaction.update(doc.ref, { runningBalance: currentBalance });
    }

    return currentBalance;
}

export async function updateProfitLoss(accountId: string, entryId: string, newAmount: number, newNotes: string, newDate: string, newOnlineClubName: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
        const entryDoc = await transaction.get(entryRef);

        if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
            throw new Error("Ledger entry not found or permission denied.");
        }
         if (entryDoc.data().type !== 'p/l') {
            throw new Error("Only P/L entries can be edited this way.");
        }
        
        transaction.update(entryRef, {
            amount: newAmount,
            notes: newNotes,
            date: newDate,
            onlineClubName: newOnlineClubName,
        });
        
        const earliestDate = entryDoc.data().date < newDate ? entryDoc.data().date : newDate;
        const newBalance = await recalculateLedger(transaction, accountId, earliestDate);

        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        transaction.update(accountRef, { balance: newBalance, lastUpdated: new Date().toISOString() });
    });
}

export async function deleteProfitLoss(accountId: string, entryId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
        const entryDoc = await transaction.get(entryRef);
        
        if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
            throw new Error("Ledger entry not found or permission denied.");
        }
        if (entryDoc.data().type !== 'p/l') {
            throw new Error("Only P/L entries can be deleted this way.");
        }
        
        const deletedEntryDate = entryDoc.data().date;
        transaction.delete(entryRef);

        const newBalance = await recalculateLedger(transaction, accountId, deletedEntryDate);
        
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        transaction.update(accountRef, { balance: newBalance, lastUpdated: new Date().toISOString() });
    });
}

// ====== ONLINE CLUB MANAGEMENT ======

export async function createOnlineClub(name: string, clubId: string): Promise<OnlineClub> {
    const newOnlineClub = { name, clubId };
    const docRef = await addDoc(collection(db, ONLINE_CLUBS_COLLECTION), newOnlineClub);
    return { id: docRef.id, ...newOnlineClub };
}

export async function getOnlineClubs(clubId?: string): Promise<OnlineClub[]> {
    const q = clubId 
        ? query(collection(db, ONLINE_CLUBS_COLLECTION), where("clubId", "==", clubId))
        : collection(db, ONLINE_CLUBS_COLLECTION);
        
    const querySnapshot = await getDocs(q);
    const clubs: OnlineClub[] = [];
    querySnapshot.forEach((doc) => {
        clubs.push({ id: doc.id, ...doc.data() } as OnlineClub);
    });
    return clubs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteOnlineClub(onlineClubId: string): Promise<void> {
    await deleteDoc(doc(db, ONLINE_CLUBS_COLLECTION, onlineClubId));
}


// ====== ADMIN DESTRUCTIVE ACTIONS ======

export async function deleteOnlinePlayerAccount(accountId: string): Promise<void> {
    const batch = writeBatch(db);

    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
    batch.delete(accountRef);

    const ledgerQuery = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId));
    const ledgerSnapshot = await getDocs(ledgerQuery);
    ledgerSnapshot.forEach(ledgerDoc => {
        batch.delete(ledgerDoc.ref);
    });

    await batch.commit();
}

export async function deleteAllOnlineDataForClub(clubId: string): Promise<void> {
    const batch = writeBatch(db);

    // Find all accounts for the given club
    const accountsQuery = query(collection(db, ONLINE_ACCOUNTS_COLLECTION), where("clubId", "==", clubId));
    const accountsSnapshot = await getDocs(accountsQuery);
    
    // For each account, find and delete all its ledger entries
    for (const accountDoc of accountsSnapshot.docs) {
        const ledgerQuery = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountDoc.id));
        const ledgerSnapshot = await getDocs(ledgerQuery);
        ledgerSnapshot.forEach(ledgerDoc => {
            batch.delete(ledgerDoc.ref);
        });
        // Also delete the account document itself
        batch.delete(accountDoc.ref);
    }
    
    // Also delete the Online Club names associated with this club
    const onlineClubsQuery = query(collection(db, ONLINE_CLUBS_COLLECTION), where("clubId", "==", clubId));
    const onlineClubsSnapshot = await getDocs(onlineClubsQuery);
    onlineClubsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}
