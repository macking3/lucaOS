import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Trader {
  trader_id: string;
  trader_name: string;
  total_pnl_pct: number;
  equity_curve?: { time: number; value: number }[];
}

interface ComparisonChartProps {
  traders: Trader[];
}

const COLORS = [
  "#F0B90B", // Binance/Yellow
  "#E13333", // Red
  "#0ECB81", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#EC4899", // Pink
  "#14B8A6", // Teal
];

export const ComparisonChart = ({ traders }: ComparisonChartProps) => {
  // Generate chart data only from real equity curves
  const chartData = React.useMemo(() => {
    // Determine time range from available data or default
    const now = Date.now();
    const startTime = now - 7 * 24 * 3600 * 1000;

    // Collect all unique timestamps from all traders' curves or default to empty
    const uniqueTimes = new Set<number>();
    traders.forEach((t) => {
      if (t.equity_curve) {
        t.equity_curve.forEach((p) => uniqueTimes.add(p.time));
      }
    });

    if (uniqueTimes.size === 0) return [];

    const sortedTimes = Array.from(uniqueTimes).sort((a, b) => a - b);

    return sortedTimes.map((time) => {
      const point: any = { time };
      traders.forEach((t) => {
        if (t.equity_curve) {
          // Find exact or closest point
          // Simplified: find exact
          const val = t.equity_curve.find((p) => p.time === time);
          if (val) point[t.trader_name] = val.value;
        }
      });
      return point;
    });
  }, [traders]);

  return (
    <div className="h-[350px] w-full bg-[#1e2329]/30 rounded-xl border border-slate-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2B3139"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => new Date(val).toLocaleDateString()}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(val) => `${val.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b0e14",
              borderColor: "#2B3139",
            }}
            labelFormatter={(label) => new Date(label).toLocaleString()}
          />
          <Legend />
          {traders.map((t, index) => (
            <Line
              key={t.trader_id}
              type="monotone"
              dataKey={t.trader_name}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
