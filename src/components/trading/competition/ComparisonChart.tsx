import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

// Types matching the props expected by the page
interface TraderData {
  trader_id: string;
  trader_name: string;
  total_pnl_pct: number;
  // In a real app, this would come from history API
  history?: { timestamp: number; pnl_pct: number }[];
}

interface ComparisonChartProps {
  traders: TraderData[];
}

// Mock history generator if not present
const generateMockHistory = (trader: TraderData) => {
  const points = [];
  const now = Date.now();
  let val = 0;
  for (let i = 0; i < 20; i++) {
    val += (Math.random() - 0.45) * 5; // Drift
    points.push({
      timestamp: now - (20 - i) * 3600000,
      pnl_pct: val,
    });
  }
  // Ensure last point matches current PnL roughly or exactly
  points.push({ timestamp: now, pnl_pct: trader.total_pnl_pct });
  return points;
};

export function ComparisonChart({ traders }: ComparisonChartProps) {
  // Transform data for Recharts
  // We need a unified timeline. For mock purposes, we'll create a merged dataset.
  const data = React.useMemo(() => {
    // Generate mock histories for demo
    const histories = traders.map((t) => ({
      id: t.trader_id,
      name: t.trader_name,
      points: t.history || generateMockHistory(t),
    }));

    // Merge into array of { time: string, [traderId]: val }
    const merged: any[] = [];
    if (histories.length > 0) {
      histories[0].points.forEach((_, idx) => {
        const point: any = {
          time: new Date(histories[0].points[idx].timestamp).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          ),
        };
        histories.forEach((h) => {
          if (h.points[idx]) {
            point[h.name] = h.points[idx].pnl_pct;
          }
        });
        merged.push(point);
      });
    }
    return merged;
  }, [traders]);

  const colors = ["#F0B90B", "#0ECB81", "#3b82f6", "#8b5cf6", "#f43f5e"];

  if (traders.length === 0)
    return (
      <div className="text-center text-slate-500 py-20">No data available</div>
    );

  return (
    <div className="w-full h-[400px] bg-[#0b0e14] rounded-xl border border-slate-800/50 p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            {traders.slice(0, 2).map((t, idx) => (
              <linearGradient
                key={t.trader_id}
                id={`grad-${t.trader_name}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={colors[idx % colors.length]}
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor={colors[idx % colors.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            stroke="#1e2329"
            vertical={false}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="time"
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#161b22",
              borderColor: "#2d333b",
              borderRadius: "8px",
            }}
            itemStyle={{ fontSize: "12px" }}
            labelStyle={{
              color: "#94a3b8",
              fontSize: "11px",
              marginBottom: "4px",
            }}
          />

          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />

          {/* Top 2 get Areas */}
          {traders.slice(0, 2).map((t, idx) => (
            <Area
              key={`area-${t.trader_id}`}
              type="monotone"
              dataKey={t.trader_name}
              stroke="none"
              fill={`url(#grad-${t.trader_name})`}
            />
          ))}

          {/* All get Lines */}
          {traders.map((t, idx) => (
            <Line
              key={`line-${t.trader_id}`}
              type="monotone"
              dataKey={t.trader_name}
              stroke={colors[idx % colors.length]}
              strokeWidth={idx < 2 ? 3 : 1.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
