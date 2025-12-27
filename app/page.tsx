import { Suspense } from "react";

import { ConversationPane } from "@/components/application/conversation-pane";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[color:var(--page-bg)]" />
      }
    >
      <ConversationPane />
    </Suspense>
  );
}
