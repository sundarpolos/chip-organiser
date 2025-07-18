"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ChartData {
  name: string
  value: number
}

interface ChipDistributionChartProps {
  data: ChartData[]
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];

export function ChipDistributionChart({ data }: ChipDistributionChartProps) {
    const totalChips = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    if (totalChips === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">No final chips to display.</p>
            </div>
        )
    }

    const chartDataWithColors = data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length]
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip
          formatter={(value, name, item) => {
            const percentage = ((Number(value) / totalChips) * 100).toFixed(1);
            return [`${value} chips (${percentage}%)`, name];
          }}
          contentStyle={{
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)'
          }}
        />
        <Legend />
        <Pie
          data={chartDataWithColors}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          labelLine={false}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent
          }) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
            return (
              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}
        >
            {chartDataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
            ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
