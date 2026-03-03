import type { CalculatedPlayer, GameExpense } from './types';

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

export function getDonutChartData(baseAmount: number, expenses: GameExpense[]): { label: string; value: number; color: string }[] {
    const data = [{ label: 'T-Shirt Base', value: baseAmount, color: '#0052B4' }];
    const expenseColors = ['#0077B6', '#48CAE4'];
    
    expenses.forEach((exp, index) => {
        data.push({ label: exp.name, value: exp.amount, color: expenseColors[index % expenseColors.length] });
    });
    
    return data;
}
