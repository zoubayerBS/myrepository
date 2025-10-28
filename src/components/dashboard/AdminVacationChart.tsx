
'use client'

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Vacation } from '@/types'

interface AdminVacationChartProps {
    data: Vacation[];
}

interface MonthlyData {
    validated: number;
    refused: number;
    pending: number;
}

export function AdminVacationChart({ data }: AdminVacationChartProps) {
    const monthlyData = data.reduce((acc, vacation) => {
        const monthKey = format(parseISO(vacation.date), 'yyyy-MM');
        if (!acc[monthKey]) {
            acc[monthKey] = { validated: 0, refused: 0, pending: 0 };
        }
        if (vacation.status === 'Validée') {
            acc[monthKey].validated++;
        } else if (vacation.status === 'Refusée') {
            acc[monthKey].refused++;
        } else {
            acc[monthKey].pending++;
        }
        return acc;
    }, {} as Record<string, MonthlyData>);

    const chartData = Object.keys(monthlyData).map(monthKey => {
        const [year, month] = monthKey.split('-');
        return {
            name: format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy', { locale: fr }),
            date: new Date(parseInt(year), parseInt(month) - 1),
            "Validées": monthlyData[monthKey].validated,
            "Refusées": monthlyData[monthKey].refused,
            "En attente": monthlyData[monthKey].pending,
        };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());


  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <Tooltip
            cursor={{ fill: 'hsl(var(--accent))' }}
            contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
            }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }}/>
        <Line type="monotone" dataKey="Validées" stroke="#22c55e" strokeWidth={2} />
        <Line type="monotone" dataKey="Refusées" stroke="#ef4444" strokeWidth={2} />
        <Line type="monotone" dataKey="En attente" stroke="#f59e0b" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
