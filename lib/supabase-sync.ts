import { supabase } from './supabase';

export type SyncKind = 'subject' | 'event' | 'goal' | 'task' | 'document';
export type SyncItem = {
  id: string;
  user_id: string;
  kind: SyncKind;
  payload: unknown;
  updated_at: string;
  deleted_at: string | null;
};

export type SyncWrite = {
  id: string;
  kind: SyncKind;
  payload: unknown;
  deletedAt?: string | null;
};

export async function getSupabaseSessionUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function pushStudyItems(items: SyncWrite[]) {
  if (!supabase || !items.length) return false;
  const userId = await getSupabaseSessionUserId();
  if (!userId) return false;

  const now = new Date().toISOString();
  const { error } = await supabase.from('study_items').upsert(
    items.map(item => ({
      id: item.id,
      user_id: userId,
      kind: item.kind,
      payload: item.payload,
      updated_at: now,
      deleted_at: item.deletedAt ?? null,
    })),
    { onConflict: 'user_id,id' },
  );
  if (error) throw error;
  return true;
}

export async function pullStudyItems() {
  if (!supabase) return [] as SyncItem[];
  const userId = await getSupabaseSessionUserId();
  if (!userId) return [] as SyncItem[];
  const { data, error } = await supabase
    .from('study_items')
    .select('id,user_id,kind,payload,updated_at,deleted_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as SyncItem[];
}

export function subscribeToStudyChanges(onChange: (item: SyncItem) => void) {
  const client = supabase;
  if (!client) return () => undefined;
  let channelName = `study-items-${Date.now()}`;
  const channel = client
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_items' }, payload => {
      const item = (payload.new ?? payload.old) as SyncItem;
      if (item?.id) onChange(item);
    })
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
