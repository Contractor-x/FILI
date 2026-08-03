import { supabase } from '../supabaseClient.js';

export async function uploadProductImage(file, productId) {
  const filePath = `${productId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}
