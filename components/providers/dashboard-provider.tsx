"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { DashboardSnapshot, PersonaSummary } from "@/app/actions";

type DashboardContextType = {
  snapshot: DashboardSnapshot;
  selectedPersona: string;
  setSelectedPersona: (persona: string) => void;
  selectedPlatform: { label: string; value: string; accent: string };
  setSelectedPlatform: (platform: { label: string; value: string; accent: string }) => void;
  topic: string;
  setTopic: (topic: string) => void;
  tone: string;
  setTone: (tone: string) => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({
  children,
  snapshot,
  initialPersona,
}: {
  children: ReactNode;
  snapshot: DashboardSnapshot;
  initialPersona?: string;
}) {
  const [selectedPersona, setSelectedPersona] = useState(
    initialPersona || snapshot.personas[0]?.name || "Tech Bob",
  );
  const [selectedPlatform, setSelectedPlatform] = useState({
    label: "小红书",
    value: "XiaoHongShu",
    accent: "text-rose-500",
  });
  const [topic, setTopic] = useState("环保随行杯发布");
  const [tone, setTone] = useState("温暖、口语化");

  const value = useMemo(
    () => ({
      snapshot,
      selectedPersona,
      setSelectedPersona,
      selectedPlatform,
      setSelectedPlatform,
      topic,
      setTopic,
      tone,
      setTone,
    }),
    [snapshot, selectedPersona, selectedPlatform, topic, tone],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

