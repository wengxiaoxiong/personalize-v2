"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPostsTimeline } from "@/app/actions/dashboard";
import { useEffect, useState } from "react";
import type { TimelineDataPoint } from "@/app/actions/dashboard";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function PostsTimelineChart() {
  const [data, setData] = useState<TimelineDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimeline() {
      const result = await getPostsTimeline(30);
      if (result.ok && result.data) {
        setData(result.data);
      }
      setLoading(false);
    }
    loadTimeline();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>帖子创建趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format date for display
  const chartData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>帖子创建趋势（近30天）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value?: number) => [`${value ?? 0} 篇`, "帖子数"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
