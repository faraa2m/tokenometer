from dataclasses import dataclass
from datetime import datetime
from typing import Iterable


@dataclass(frozen=True)
class Trade:
    symbol: str
    quantity: int
    price: float
    timestamp: datetime

    @property
    def notional(self) -> float:
        return self.quantity * self.price


def fifo_realised_pnl(trades: Iterable[Trade]) -> dict[str, float]:
    """Compute realised PnL per symbol using strict FIFO matching.

    Buys add to a queue; sells consume from the front of the queue at the
    matched cost basis. Trades must be sorted ascending by timestamp.
    """
    lots: dict[str, list[tuple[int, float]]] = {}
    realised: dict[str, float] = {}
    for trade in trades:
        symbol_lots = lots.setdefault(trade.symbol, [])
        if trade.quantity > 0:
            symbol_lots.append((trade.quantity, trade.price))
            continue
        remaining = -trade.quantity
        pnl = 0.0
        while remaining > 0 and symbol_lots:
            qty, cost = symbol_lots[0]
            consumed = min(qty, remaining)
            pnl += consumed * (trade.price - cost)
            remaining -= consumed
            if consumed == qty:
                symbol_lots.pop(0)
            else:
                symbol_lots[0] = (qty - consumed, cost)
        if remaining > 0:
            raise ValueError(f"Sell exceeds inventory for {trade.symbol}")
        realised[trade.symbol] = realised.get(trade.symbol, 0.0) + pnl
    return realised
