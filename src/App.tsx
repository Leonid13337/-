import { useState, useMemo, useCallback } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  Wallets,
  WalletKey,
  Transaction,
  Askeza,
  DaySnapshot,
  WALLET_NAMES,
  WALLET_PERCENTS,
  WALLET_ICONS,
  WALLET_ORDER,
  emptyWallets,
  todayStr,
  formatMoney,
  formatDate,
} from "./types";

type ModalType = "income" | "expense" | "report" | "askeza" | null;

export default function App() {
  const [wallets, setWallets] = useLocalStorage<Wallets>("fw_wallets", { ...emptyWallets });
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("fw_transactions", []);
  const [daySnapshots, setDaySnapshots] = useLocalStorage<DaySnapshot[]>("fw_snapshots", []);
  const [askezaData, setAskezaData] = useLocalStorage<Askeza[]>("fw_askeza", []);

  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<WalletKey>("life");
  const [copied, setCopied] = useState(false);

  const total = wallets.charity + wallets.invest + wallets.ads + wallets.life;
  const today = todayStr();

  // Ensure today's snapshot exists
  const ensureTodaySnapshot = useCallback(() => {
    setDaySnapshots((prev) => {
      const existing = prev.find((s) => s.date === today);
      if (!existing) {
        return [...prev, { date: today, wallets: { ...wallets } }];
      }
      return prev;
    });
  }, [today, wallets, setDaySnapshots]);

  // Today's askeza
  const todayAskeza = useMemo(() => {
    return askezaData.find((a) => a.date === today) || { date: today, swearCount: 0, pushupSets: 0 };
  }, [askezaData, today]);

  const updateAskeza = useCallback(
    (updater: (a: Askeza) => Askeza) => {
      setAskezaData((prev) => {
        const idx = prev.findIndex((a) => a.date === today);
        const current = idx >= 0 ? prev[idx] : { date: today, swearCount: 0, pushupSets: 0 };
        const updated = updater(current);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    },
    [today, setAskezaData]
  );

  // Handle income
  const handleIncome = () => {
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) return;

    ensureTodaySnapshot();

    const distribution = {
      charity: Math.round(num * 0.05),
      invest: Math.round(num * 0.15),
      ads: Math.round(num * 0.30),
      life: 0,
    };
    distribution.life = num - distribution.charity - distribution.invest - distribution.ads;

    setWallets((prev) => ({
      charity: prev.charity + distribution.charity,
      invest: prev.invest + distribution.invest,
      ads: prev.ads + distribution.ads,
      life: prev.life + distribution.life,
    }));

    const tx: Transaction = {
      id: Date.now().toString(),
      type: "income",
      amount: num,
      timestamp: Date.now(),
      date: today,
    };
    setTransactions((prev) => [...prev, tx]);
    setAmount("");
    setModal(null);
  };

  // Handle expense
  const handleExpense = () => {
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) return;

    ensureTodaySnapshot();

    setWallets((prev) => ({
      ...prev,
      [selectedWallet]: prev[selectedWallet] - num,
    }));

    const tx: Transaction = {
      id: Date.now().toString(),
      type: "expense",
      amount: num,
      wallet: selectedWallet,
      timestamp: Date.now(),
      date: today,
    };
    setTransactions((prev) => [...prev, tx]);
    setAmount("");
    setModal(null);
  };

  // Evening report
  const reportLine = useMemo(() => {
    const snap = daySnapshots.find((s) => s.date === today);
    const startTotal = snap
      ? snap.wallets.charity + snap.wallets.invest + snap.wallets.ads + snap.wallets.life
      : total;
    const delta = total - startTotal;
    const sign = delta >= 0 ? "+" : "";

    return `${formatDate(today)} | Ж:${formatMoney(wallets.life)} Р:${formatMoney(wallets.ads)} И:${formatMoney(wallets.invest)} Б:${formatMoney(wallets.charity)} | Σ${formatMoney(total)} | ${sign}${formatMoney(delta)}`;
  }, [today, wallets, total, daySnapshots]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = reportLine;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Today's transactions
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date === today).reverse();
  }, [transactions, today]);

  const todayIncome = useMemo(() => todayTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), [todayTransactions]);
  const todayExpense = useMemo(() => todayTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), [todayTransactions]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col select-none">
      {/* Header */}
      <header className="pt-6 pb-2 px-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide text-neutral-400 uppercase">Финучёт</h1>
          <span className="text-xs text-neutral-600 font-mono">{formatDate(today)}</span>
        </div>
      </header>

      {/* Total */}
      <div className="px-5 py-4">
        <div className="text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Общий баланс</div>
          <div className={`text-4xl font-bold tracking-tight font-mono ${total >= 0 ? "text-neutral-100" : "text-red-400"}`}>
            {formatMoney(total)}
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="px-4 space-y-2">
        {WALLET_ORDER.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg opacity-40">{WALLET_ICONS[key]}</span>
              <div>
                <div className="text-sm text-neutral-300 font-medium">{WALLET_NAMES[key]}</div>
                <div className="text-[10px] text-neutral-600 uppercase tracking-wider">{WALLET_PERCENTS[key]}%</div>
              </div>
            </div>
            <div className={`text-lg font-mono font-semibold ${wallets[key] >= 0 ? "text-neutral-100" : "text-red-400"}`}>
              {formatMoney(wallets[key])}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => { setModal("income"); setAmount(""); }}
          className="bg-emerald-600/20 border border-emerald-700/50 text-emerald-400 rounded-xl py-4 text-lg font-semibold active:scale-95 transition-transform"
        >
          + Приход
        </button>
        <button
          onClick={() => { setModal("expense"); setAmount(""); setSelectedWallet("life"); }}
          className="bg-red-600/15 border border-red-800/50 text-red-400 rounded-xl py-4 text-lg font-semibold active:scale-95 transition-transform"
        >
          − Расход
        </button>
      </div>

      {/* Bottom buttons */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => { ensureTodaySnapshot(); setModal("report"); setCopied(false); }}
          className="bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl py-3.5 text-sm font-medium active:scale-95 transition-transform"
        >
          📋 Вечерний отчёт
        </button>
        <button
          onClick={() => setModal("askeza")}
          className="bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl py-3.5 text-sm font-medium active:scale-95 transition-transform"
        >
          🔥 Аскеза
        </button>
      </div>

      {/* Today's summary */}
      {todayTransactions.length > 0 && (
        <div className="px-4 pt-5 pb-2">
          <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Сегодня</div>
          <div className="flex gap-4 text-xs font-mono">
            {todayIncome > 0 && <span className="text-emerald-500/70">+{formatMoney(todayIncome)}</span>}
            {todayExpense > 0 && <span className="text-red-500/70">−{formatMoney(todayExpense)}</span>}
          </div>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {todayTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs text-neutral-600 font-mono">
                <span>
                  {new Date(tx.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  {tx.type === "expense" && tx.wallet && ` · ${WALLET_NAMES[tx.wallet].slice(0, 5)}`}
                </span>
                <span className={tx.type === "income" ? "text-emerald-600" : "text-red-600"}>
                  {tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg bg-[#111111] border-t border-neutral-800 rounded-t-2xl p-5 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Income Modal */}
            {modal === "income" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-emerald-400">Приход</h2>
                  <button onClick={() => setModal(null)} className="text-neutral-600 text-2xl leading-none">&times;</button>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Сумма"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-2xl font-mono text-center text-neutral-100 focus:outline-none focus:border-emerald-600 placeholder:text-neutral-700"
                />
                {amount && parseFloat(amount) > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {WALLET_ORDER.map((key) => {
                      const num = parseFloat(amount.replace(",", "."));
                      const pct = WALLET_PERCENTS[key] / 100;
                      let val: number;
                      if (key === "life") {
                        const c = Math.round(num * 0.05);
                        const i = Math.round(num * 0.15);
                        const a = Math.round(num * 0.30);
                        val = num - c - i - a;
                      } else {
                        val = Math.round(num * pct);
                      }
                      return (
                        <div key={key} className="flex justify-between text-sm text-neutral-500 font-mono">
                          <span>{WALLET_NAMES[key]} ({WALLET_PERCENTS[key]}%)</span>
                          <span className="text-neutral-300">+{formatMoney(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={handleIncome}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full mt-5 bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-xl py-4 text-lg font-semibold active:scale-95 transition-transform"
                >
                  Внести
                </button>
              </div>
            )}

            {/* Expense Modal */}
            {modal === "expense" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-red-400">Расход</h2>
                  <button onClick={() => setModal(null)} className="text-neutral-600 text-2xl leading-none">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {WALLET_ORDER.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedWallet(key)}
                      className={`border rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                        selectedWallet === key
                          ? "bg-red-600/20 border-red-700/60 text-red-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-500"
                      }`}
                    >
                      <div>{WALLET_ICONS[key]} {WALLET_NAMES[key]}</div>
                      <div className="text-xs font-mono mt-1 text-neutral-600">{formatMoney(wallets[key])}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Сумма"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-2xl font-mono text-center text-neutral-100 focus:outline-none focus:border-red-600 placeholder:text-neutral-700"
                />
                <button
                  onClick={handleExpense}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full mt-5 bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-xl py-4 text-lg font-semibold active:scale-95 transition-transform"
                >
                  Списать из «{WALLET_NAMES[selectedWallet]}»
                </button>
              </div>
            )}

            {/* Report Modal */}
            {modal === "report" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-neutral-300">📋 Вечерний отчёт</h2>
                  <button onClick={() => setModal(null)} className="text-neutral-600 text-2xl leading-none">&times;</button>
                </div>
                <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">
                  Строка для блокнота
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 font-mono text-sm text-neutral-300 break-all leading-relaxed">
                  {reportLine}
                </div>
                <button
                  onClick={copyReport}
                  className={`w-full mt-4 border rounded-xl py-4 text-lg font-semibold active:scale-95 transition-all ${
                    copied
                      ? "bg-emerald-600/20 border-emerald-700/50 text-emerald-400"
                      : "bg-neutral-900 border-neutral-700 text-neutral-300"
                  }`}
                >
                  {copied ? "✓ Скопировано" : "Копировать"}
                </button>

                {/* Detailed breakdown */}
                <div className="mt-5 space-y-2 text-sm text-neutral-500">
                  <div className="text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Детали</div>
                  {WALLET_ORDER.map((key) => {
                    const snap = daySnapshots.find((s) => s.date === today);
                    const start = snap ? snap.wallets[key] : wallets[key];
                    const diff = wallets[key] - start;
                    const sign = diff >= 0 ? "+" : "";
                    return (
                      <div key={key} className="flex justify-between font-mono">
                        <span>{WALLET_NAMES[key]}</span>
                        <span>
                          <span className="text-neutral-400">{formatMoney(wallets[key])}</span>
                          {diff !== 0 && (
                            <span className={`ml-2 text-xs ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              ({sign}{formatMoney(diff)})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Askeza Modal */}
            {modal === "askeza" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-orange-400">🔥 Аскеза</h2>
                  <button onClick={() => setModal(null)} className="text-neutral-600 text-2xl leading-none">&times;</button>
                </div>

                {/* Swear words */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-neutral-300 font-medium">🤬 Матные слова</div>
                      <div className="text-xs text-neutral-600 mt-0.5">Отметь каждое нарушение</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateAskeza((a) => ({ ...a, swearCount: Math.max(0, a.swearCount - 1) }))}
                        className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 text-xl font-bold active:scale-90 transition-transform"
                      >
                        −
                      </button>
                      <span className="text-2xl font-mono font-bold text-red-400 w-8 text-center">
                        {todayAskeza.swearCount}
                      </span>
                      <button
                        onClick={() => updateAskeza((a) => ({ ...a, swearCount: a.swearCount + 1 }))}
                        className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-700/50 text-red-400 text-xl font-bold active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pushups */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-neutral-300 font-medium">💪 Отжимания</div>
                      <div className="text-xs text-neutral-600 mt-0.5">Отработал подходами</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateAskeza((a) => ({ ...a, pushupSets: Math.max(0, a.pushupSets - 1) }))}
                        className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 text-xl font-bold active:scale-90 transition-transform"
                      >
                        −
                      </button>
                      <span className="text-2xl font-mono font-bold text-emerald-400 w-8 text-center">
                        {todayAskeza.pushupSets}
                      </span>
                      <button
                        onClick={() => updateAskeza((a) => ({ ...a, pushupSets: a.pushupSets + 1 }))}
                        className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-700/50 text-emerald-400 text-xl font-bold active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Askeza status */}
                <div className="mt-4 text-center">
                  {todayAskeza.swearCount === 0 ? (
                    <div className="text-sm text-emerald-500/70">✓ Чистый день</div>
                  ) : (
                    <div className="text-sm text-neutral-500">
                      Нарушений: <span className="text-red-400">{todayAskeza.swearCount}</span>
                      {todayAskeza.pushupSets > 0 && (
                        <span className="text-emerald-500"> · Отработано: {todayAskeza.pushupSets}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
