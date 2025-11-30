import { HomeClient } from "@/components/home-client";
import { getDashboardSnapshot } from "./actions";

export default async function Page() {
  const snapshot = await getDashboardSnapshot();
  return <HomeClient snapshot={snapshot} mode="landing" />;
}
