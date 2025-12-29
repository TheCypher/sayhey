import { Suspense } from "react";

import { ConversationPane } from "@/components/application/conversation-pane";

type JournalPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JournalPage({ params }: JournalPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-white" />}>
      <ConversationPane
        key={id}
        initialView="history"
        conversationId={id}
      />
    </Suspense>
  );
}
