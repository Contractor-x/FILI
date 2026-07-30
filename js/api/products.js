import { supabase } from '../supabaseClient.js';

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getProductsByCategorySlug(categorySlug) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, image_url, categories!inner(slug)')
    .eq('is_active', true)
    .eq('categories.slug', categorySlug);
  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, price, compare_at_price, stock, image_url,
      variants ( id, name, value, price_override, stock, sku ),
      product_images ( id, url, sort_order )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}
