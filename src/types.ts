export interface Wallets {
  charity: number;    // Благотворительность 5%
  invest: number;     // Инвест/Подушка 15%
  ads: number;        // Реклама/Работа 30%
  life: number;       // Жизнь 50%
}

export type WalletKey = keyof Wallets;

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  wallet?: WalletKey;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface Askeza {
  date: string;
  swearCount: number;
  pushupSets: number;
}

export interface DaySnapshot {
  date: string;
  wallets: Wallets;
}

export const WALLET_NAMES: Record<WalletKey, string> = {
  charity: "Благотворительность",
  invest: "Инвест/Подушка",
  ads: "Реклама/Работа",
  life: "Жизнь",
};

export const WALLET_PERCENTS: Record<WalletKey, number> = {
  charity: 5,
  invest: 15,
  ads: 30,
  life: 50,
};

export const WALLET_ICONS: Record<WalletKey, string> = {
  charity: "♡",
  invest: "◆",
  ads: "▶",
  life: "●",
};

export const WALLET_ORDER: WalletKey[] = ["life", "ads", "invest", "charity"];

export const emptyWallets: Wallets = {
  charity: 0,
  invest: 0,
  ads: 0,
  life: 0,
};

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}
