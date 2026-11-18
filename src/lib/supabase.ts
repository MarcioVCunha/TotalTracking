import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LordProgress, CampaignRun, PlaySession } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentConfig = { url: '', anonKey: '' };

export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const targetUrl = url || currentConfig.url || (import.meta.env.VITE_SUPABASE_URL as string);
  const targetKey = anonKey || currentConfig.anonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

  if (!targetUrl || !targetKey) {
    return null;
  }

  if (cachedClient && currentConfig.url === targetUrl && currentConfig.anonKey === targetKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(targetUrl, targetKey);
    currentConfig = { url: targetUrl, anonKey: targetKey };
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Sync local progress, runs, and sessions with Supabase Cloud
 */
export async function syncWithSupabase(
  client: SupabaseClient,
  localData: {
    lords: Record<number, LordProgress>;
    runs: CampaignRun[];
    sessions: PlaySession[];
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();
    const userId = userData?.user?.id || null;

    // 1. Sync Lord Progress
    const progressRows = Object.entries(localData.lords).map(([idStr, prog]) => ({
      lord_id: parseInt(idStr, 10),
      user_id: userId,
      short_victory: prog.short,
      long_victory: prog.long,
      crisis_victory: prog.crisis,
      black_border: prog.black,
      custom_portrait_url: prog.customImg || null,
      updated_at: new Date().toISOString()
    }));

    if (progressRows.length > 0) {
      const { error: progErr } = await client
        .from('lord_progress')
        .upsert(progressRows, { onConflict: userId ? 'user_id,lord_id' : undefined });
      if (progErr) console.warn('Could not sync lord_progress:', progErr.message);
    }

    // 2. Sync Campaign Runs
    if (localData.runs.length > 0) {
      const runsRows = localData.runs.map(r => ({
        id: r.id.length === 36 ? r.id : undefined, // only if UUID
        user_id: userId,
        lord_id: r.lordId,
        status: r.status,
        difficulty: r.difficulty,
        final_turn: r.finalTurn,
        start_date: r.startDate,
        end_date: r.endDate || null,
        manual_days: r.manualDays || 1,
        total_seconds: r.totalSeconds || 0,
        notes: r.notes || '',
        is_black_border_eligible: !!r.isBlackBorderEligible,
        created_at: new Date(r.createdAt || Date.now()).toISOString()
      }));

      const { error: runErr } = await client
        .from('campaign_runs')
        .upsert(runsRows);
      if (runErr) console.warn('Could not sync campaign_runs:', runErr.message);
    }

    return { success: true, message: 'Sincronizado com a nuvem com sucesso!' };
  } catch (err: any) {
    console.error('Error during Supabase sync:', err);
    return { success: false, message: err?.message || 'Erro de sincronização' };
  }
}
