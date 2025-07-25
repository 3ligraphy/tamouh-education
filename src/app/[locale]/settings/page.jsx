import { redirect } from "next/navigation";

import UserSettings from "@/app/_components/user-settings";
import { auth } from "@/server/auth";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <UserSettings />
    </main>
  );
}
