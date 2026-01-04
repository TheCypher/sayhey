import { Suspense } from "react";
import { cookies } from "next/headers";

import { ConversationPane } from "@/components/application/conversation-pane";
import { getSessionIdentity } from "@/lib/auth/session-identity";

type JournalPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const JOURNAL_THEME_CLASS =
  "[--page-accent:#6fb09a] [--page-accent-strong:#1d554c]";

export default async function JournalPage({ params }: JournalPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const identity = await getSessionIdentity(token);

  return (
    <div className={JOURNAL_THEME_CLASS}>
      <Suspense fallback={<div className="min-h-[100dvh] bg-white" />}>
        <ConversationPane
          key={id}
          initialView="history"
          conversationId={id}
          displayName={identity?.displayName}
          userEmail={identity?.email}
        />
      </Suspense>
    </div>
  );
}
