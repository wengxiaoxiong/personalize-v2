import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/actions";
import { LoginForm } from "./_components/LoginForm";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();

  // 如果用户已登录，重定向到 dashboard
  if (sessionUser) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
