import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/actions";
import { RegisterForm } from "./_components/RegisterForm";

export default async function RegisterPage() {
  const sessionUser = await getSessionUser();

  // 如果用户已登录，重定向到 dashboard
  if (sessionUser) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
