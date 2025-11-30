import { redirect } from "next/navigation";

import { HomeClient } from "@/components/home-client";

import { getAuthUser, getDashboardSnapshot } from "../actions";

export default async function DashboardPage() {
  const user = getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const snapshot = await getDashboardSnapshot();

  return <HomeClient snapshot={snapshot} mode="app" userEmail={user} />;
}
