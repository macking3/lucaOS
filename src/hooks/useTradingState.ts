import { useState } from "react";
import {
  CryptoWallet,
  TradeLog,
  ForexAccount,
  ForexTradeLog,
  PolyPosition,
} from "../types";

export function useTradingState() {
  const [showCryptoTerminal, setShowCryptoTerminal] = useState(false);
  const [cryptoWallet, setCryptoWallet] = useState<CryptoWallet | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeLog[]>([]);

  const [showForexTerminal, setShowForexTerminal] = useState(false);
  const [forexAccount, setForexAccount] = useState<ForexAccount | null>(null);
  const [forexTrades, setForexTrades] = useState<ForexTradeLog[]>([]);

  const [showPredictionTerminal, setShowPredictionTerminal] = useState(false);
  const [polyPositions, setPolyPositions] = useState<PolyPosition[]>([]);

  return {
    showCryptoTerminal,
    setShowCryptoTerminal,
    cryptoWallet,
    setCryptoWallet,
    tradeHistory,
    setTradeHistory,
    showForexTerminal,
    setShowForexTerminal,
    forexAccount,
    setForexAccount,
    forexTrades,
    setForexTrades,
    showPredictionTerminal,
    setShowPredictionTerminal,
    polyPositions,
    setPolyPositions,
  };
}
