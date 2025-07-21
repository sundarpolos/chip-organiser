import type { CalculatedPlayer } from './types';

export function calculateInterPlayerTransfers(players: CalculatedPlayer[]): string[] {
    const payers = players
        .filter(p => p.profitLoss < 0)
        .map(p => ({ ...p, amount: -p.profitLoss }))
        .sort((a, b) => b.amount - a.amount);

    const receivers = players
        .filter(p => p.profitLoss > 0)
        .map(p => ({ ...p, amount: p.profitLoss }))
        .sort((a, b) => b.amount - a.amount);

    const transfers: string[] = [];

    while (payers.length > 0 && receivers.length > 0) {
        const payer = payers[0];
        const receiver = receivers[0];
        const amount = Math.min(payer.amount, receiver.amount);

        transfers.push(`<strong>${payer.name}</strong> pays <strong>${receiver.name}</strong>: ${amount.toFixed(0)}`);

        payer.amount -= amount;
        receiver.amount -= amount;

        if (payer.amount < 0.01) {
            payers.shift();
        }
        if (receiver.amount < 0.01) {
            receivers.shift();
        }
    }

    return transfers;
}
