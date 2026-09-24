import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tells you when this pod's seats or sessions change, so the lobby fills up on its own
 * and everyone moves to the focus screen together. Row-level security still applies,
 * so only members receive these.
 */
export function watchPod(client: SupabaseClient, podId: string, onChange: () => void): () => void {
  const channel = client
    .channel(`pod:${podId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "pod_members", filter: `pod_id=eq.${podId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `pod_id=eq.${podId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
