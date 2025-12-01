import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/app/dashboard/components/dashboard-sidebar";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { getDashboardSnapshot, getSessionUser } from "../actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  // 如果用户未登录或不存在，重定向到登录页
  if (!sessionUser) {
    redirect("/login");
  }

  const snapshot = await getDashboardSnapshot();
  const initialPersona = snapshot.personas[0]?.name;

  return (
    <DashboardProvider snapshot={snapshot} initialPersona={initialPersona} user={sessionUser}>
      <div className="min-h-screen">
        <DashboardSidebar />
        <main className="ml-20 flex-1 p-6 lg:ml-64 lg:p-10">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}

