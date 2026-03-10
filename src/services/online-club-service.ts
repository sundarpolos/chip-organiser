

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
    const q = collection(db, ONLINE_ACCOUNTS_COLLECTION);
    const querySnapshot = await getDocs(q);
    const accounts: OnlinePlayerAccount[] = [];
    querySnapshot.forEach((doc) => {
        accounts.push({ id: doc.id, ...doc.data() } as OnlinePlayerAccount);
    });
    
    if (clubId) {
        return accounts.filter(acc => acc.clubId === clubId).sort((a,b) => a.playerName.localeCompare(b.playerName));
    }
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

export async function getAllOnlineLedgerEntries(): Promise<OnlineLedgerEntry[]> {
    const querySnapshot = await getDocs(collection(db, ONLINE_LEDGER_COLLECTION));
    const entries: OnlineLedgerEntry[] = [];
    querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as OnlineLedgerEntry);
    });
    return entries;
}

export async function addProfitLoss(accountId: string, amount: number, date: string, onlineClubName: string): Promise<void> {
    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
        await getOnlinePlayerAccount(accountId);
    }
    const newLedgerEntry: Omit<OnlineLedgerEntry, 'id'> = {
        accountId,
        type: 'p/l',
        amount,
        date: new Date(date).toISOString(),
        notes: '',
        onlineClubName,
        runningBalance: 0, // Placeholder, will be corrected by recalculation
    };
    await addDoc(collection(db, ONLINE_LEDGER_COLLECTION), newLedgerEntry);
    await recalculateAccountBalance(accountId);
}


export async function recordTransaction(accountId: string, type: 'deposit' | 'withdrawal', amount: number, paymentMode: string, date: string, onlineClubName: string): Promise<void> {
    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
        await getOnlinePlayerAccount(accountId);
    }
    const transactionAmount = type === 'deposit' ? amount : -amount;

    let transactionDate: Date;
    if (date) {
        transactionDate = new Date(date);
        // Set to midday to avoid timezone issues, making it consistent with P/L entries
        transactionDate.setHours(12, 0, 0, 0); 
    } else {
        transactionDate = new Date();
    }

    const newLedgerEntry: Omit<OnlineLedgerEntry, 'id'> = {
        accountId,
        type,
        amount: transactionAmount,
        date: transactionDate.toISOString(),
        notes: paymentMode,
        onlineClubName,
        runningBalance: 0, // Placeholder, will be fixed by recalculation
    };
    
    await addDoc(collection(db, ONLINE_LEDGER_COLLECTION), newLedgerEntry);
    await recalculateAccountBalance(accountId);
}

export async function updateProfitLoss(accountId: string, entryId: string, newAmount: number, newDate: string, newOnlineClubName: string): Promise<void> {
    const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
    const entryDoc = await getDoc(entryRef);

    if (!entryDoc.exists() || entryDoc.data().accountId !== accountId || entryDoc.data().type !== 'p/l') {
        throw new Error("Ledger entry not found, is not a P/L entry, or permission denied.");
    }
    
    const updatedDate = new Date(newDate);
    updatedDate.setHours(12, 0, 0, 0);
    await setDoc(entryRef, {
        amount: newAmount,
        notes: '',
        date: updatedDate.toISOString(),
        onlineClubName: newOnlineClubName,
    }, { merge: true });

    await recalculateAccountBalance(accountId);
}

export async function deleteProfitLoss(accountId: string, entryId: string): Promise<void> {
    const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
    const entryDoc = await getDoc(entryRef);
    if (!entryDoc.exists() || entryDoc.data().accountId !== accountId || entryDoc.data().type !== 'p/l') {
        throw new Error("Ledger entry not found, is not a P/L entry, or permission denied.");
    }

    await deleteDoc(entryRef);

    await recalculateAccountBalance(accountId);
}

export async function updateTransaction(
  accountId: string,
  entryId: string,
  newAmount: number,
  newPaymentMode: string,
  newDate: string,
  newOnlineClubName: string
): Promise<void> {
  const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
  const entryDoc = await getDoc(entryRef);

  if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
    throw new Error("Ledger entry not found or permission denied.");
  }
  const entryData = entryDoc.data();
  if (entryData.type === 'p/l') {
    throw new Error("This function cannot be used to edit P/L entries.");
  }

  const transactionType = entryData.type as 'deposit' | 'withdrawal';
  const transactionAmount = transactionType === 'deposit' ? Math.abs(newAmount) : -Math.abs(newAmount);

  const updatedDate = new Date(newDate);
  updatedDate.setHours(12, 0, 0, 0);

  await setDoc(entryRef, {
    amount: transactionAmount,
    notes: newPaymentMode,
    date: updatedDate.toISOString(),
    onlineClubName: newOnlineClubName,
  }, { merge: true });

  await recalculateAccountBalance(accountId);
}

export async function deleteTransaction(accountId: string, entryId: string): Promise<void> {
  const entryRef = doc(db, ONLINE_LEDGER_COLLECTION, entryId);
  const entryDoc = await getDoc(entryRef);
  if (!entryDoc.exists() || entryDoc.data().accountId !== accountId) {
    throw new Error("Ledger entry not found or permission denied.");
  }
  if (entryDoc.data().type === 'p/l') {
      throw new Error("This function cannot be used to delete P/L entries.");
  }

  await deleteDoc(entryRef);

  await recalculateAccountBalance(accountId);
}

async function recalculateAccountBalance(accountId: string): Promise<void> {
    const q = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId));
    const querySnapshot = await getDocs(q);
    const entries: OnlineLedgerEntry[] = [];
    querySnapshot.forEach(doc => {
        entries.push({ id: doc.id, ...doc.data() } as OnlineLedgerEntry);
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const batch = writeBatch(db);
    let currentBalance = 0;
    for (const entry of entries) {
        currentBalance += entry.amount;
        const entryRefToUpdate = doc(db, ONLINE_LEDGER_COLLECTION, entry.id);
        if (entry.runningBalance !== currentBalance) {
            batch.update(entryRefToUpdate, { runningBalance: currentBalance });
        }
    }

    const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
    
    // Update balance
    batch.update(accountRef, { 
        balance: currentBalance,
        lastUpdated: new Date().toISOString(),
    });
    
    await batch.commit();
}


// ====== ONLINE CLUB MANAGEMENT ======

export async function createOnlineClub(name: string, currency?: string, whatsappGroupId?: string, eligiblePlayerIds?: string[], weeklyMinimumCharge?: number, chargeDayOfWeek?: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'): Promise<OnlineClub> {
    const newOnlineClub: Omit<OnlineClub, 'id'> = { 
        name, 
        currency: currency || 'INR', 
        whatsappGroupId: whatsappGroupId || '', 
        eligiblePlayerIds: eligiblePlayerIds || [],
        weeklyMinimumCharge: weeklyMinimumCharge || 0,
    };
    if (chargeDayOfWeek) {
        (newOnlineClub as OnlineClub).chargeDayOfWeek = chargeDayOfWeek;
    }
    const docRef = await addDoc(collection(db, ONLINE_CLUBS_COLLECTION), newOnlineClub);
    return { id: docRef.id, ...newOnlineClub };
}

export async function updateOnlineClub(onlineClubId: string, updates: Partial<Pick<OnlineClub, 'name' | 'currency' | 'whatsappGroupId' | 'eligiblePlayerIds' | 'weeklyMinimumCharge' | 'chargeDayOfWeek'>>): Promise<void> {
    const docRef = doc(db, ONLINE_CLUBS_COLLECTION, onlineClubId);
    await setDoc(docRef, updates, { merge: true });
}

export async function getOnlineClubs(): Promise<OnlineClub[]> {
    const querySnapshot = await getDocs(collection(db, ONLINE_CLUBS_COLLECTION));
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

export async function deleteMultipleOnlinePlayerAccounts(accountIds: string[]): Promise<void> {
    const batch = writeBatch(db);

    for (const accountId of accountIds) {
        const accountRef = doc(db, ONLINE_ACCOUNTS_COLLECTION, accountId);
        batch.delete(accountRef);

        const ledgerQuery = query(collection(db, ONLINE_LEDGER_COLLECTION), where("accountId", "==", accountId));
        const ledgerSnapshot = await getDocs(ledgerQuery);
        ledgerSnapshot.forEach(ledgerDoc => {
            batch.delete(ledgerDoc.ref);
        });
    }

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

    await batch.commit();
}
