import { supabase } from '../supabaseClient.js';

export async function upsertVariants(productId, variants) {
  if (!variants || !variants.length) return;
  const rows = variants.map(v => ({ ...v, product_id: productId }));
  const { error } = await supabase.from('variants').upsert(rows);
  if (error) throw error;
}

export async function deleteVariant(id) {
  const { error } = await supabase.from('variants').delete().eq('id', id);
  if (error) throw error;
}
