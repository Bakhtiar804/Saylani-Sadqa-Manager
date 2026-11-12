import Copilot from "@/components/dashboard/copilot";
import { verifyUserSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { isCurrentLoginSession } from "@/lib/admin-accounts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const metadata = {
  title: "Insight Studio | Saylani Sadqa Manager",
  description: "Read-only analytics assistant for permitted Saylani records.",
};

export default async function InsightsPage() {
  await connection();
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !(await isCurrentLoginSession(session))) redirect("/sign-in");

  return <Copilot standalone userName={session.name} userRole={session.role} />;
}
