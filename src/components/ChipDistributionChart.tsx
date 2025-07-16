"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Tooltip } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartData {
  name: string
  value: number
}

interface ChipDistributionChartProps {
  data: ChartData[]
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];

const chartConfig = {} satisfies ChartConfig

export function ChipDistributionChart({ data }: ChipDistributionChartProps) {
    const totalChips = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    if (totalChips === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-muted-foreground">No final chips to display.</p>
            </div>
        )
    }

    const chartDataWithColors = data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length]
    }))

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full min-h-[250px]">
      <PieChart>
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent 
            hideLabel 
            formatter={(value, name, item) => (
                <div className="flex flex-col">
                    <span className="font-bold">{item.payload.name}</span>
                    <span>Chips: {value}</span>
                    <span>Share: {((Number(value) / totalChips) * 100).toFixed(1)}%</span>
                </div>
            )}
            />}
        />
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
            value,
            index,
          }) => {
            const RADIAN = Math.PI / 180
            const radius = 25 + innerRadius + (outerRadius - innerRadius)
            const x = cx + radius * Math.cos(-midAngle * RADIAN)
            const y = cy + radius * Math.sin(-midAngle * RADIAN)

            return (
              <text
                x={x}
                y={y}
                className="fill-foreground text-xs"
                textAnchor={x > cx ? "start" : "end"}
                dominantBaseline="central"
              >
                {chartDataWithColors[index].name}
              </text>
            )
          }}
        >
            {chartDataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
