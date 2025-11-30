import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { getAuthUser, getDashboardSnapshot } from "../actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const snapshot = await getDashboardSnapshot();
  const initialPersona = snapshot.personas[0]?.name;

  return (
    <DashboardProvider snapshot={snapshot} initialPersona={initialPersona}>
      <div className="min-h-screen">
        <DashboardSidebar />
        <main className="ml-20 flex-1 p-6 lg:ml-64 lg:p-10">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}

