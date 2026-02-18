"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ScanDataPoint {
  date: string;
  scans: number;
  flagged: number;
}

export function ScanChart({ data }: { data: ScanDataPoint[] }) {
  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4A7C5F" opacity={0.3} />
          <XAxis
            dataKey="dateLabel"
            stroke="#4A7C5F"
            tick={{ fill: "#E8F5EE", fontSize: 12 }}
          />
          <YAxis
            stroke="#4A7C5F"
            tick={{ fill: "#E8F5EE", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0D1612",
              border: "1px solid #4A7C5F",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#E8F5EE" }}
            formatter={(value: number | undefined) => [value ?? 0, ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="scans"
            name="Total Scans"
            stroke="#3DDC84"
            strokeWidth={2}
            dot={{ fill: "#3DDC84" }}
          />
          <Line
            type="monotone"
            dataKey="flagged"
            name="Flagged"
            stroke="#F5C842"
            strokeWidth={2}
            dot={{ fill: "#F5C842" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
