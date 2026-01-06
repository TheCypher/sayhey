import { Suspense } from "react";
import { cookies } from "next/headers";

import { ConversationPane } from "@/components/application/conversation-pane";
import { getSessionIdentity } from "@/lib/auth/session-identity";

const NEW_JOURNAL_THEME_CLASS = "home-theme";

export default async function NewJournalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const identity = await getSessionIdentity(token);

  return (
    <div className={NEW_JOURNAL_THEME_CLASS}>
      <Suspense
        fallback={<div className="min-h-[100dvh] bg-[color:var(--page-bg)]" />}
      >
        <ConversationPane
          initialView="home"
          displayName={identity?.displayName}
          userEmail={identity?.email}
        />
      </Suspense>
    </div>
  );
}
