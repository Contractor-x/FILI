import { supabase } from '../supabaseClient.js';

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, image_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
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

export async function getAllProductsAdmin() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active, image_url, categories(name)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProductForEdit(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*), product_images(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, product) {
  const { error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id);
  if (error) throw error;
}

export async function toggleProductActive(id, isActive) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export function subscribeToProductChanges(callback, tables = ['products']) {
  const channel = supabase.channel(`storefront-${tables.join('-')}`);
  tables.forEach((table) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => callback(payload, table)
    );
  });
  channel.subscribe();
  return channel;
}
