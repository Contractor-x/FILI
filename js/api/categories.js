import { supabase } from '../supabaseClient.js';

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getCategoriesWithCounts() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, products(count)')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createCategory(name, slug) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id, name, slug) {
  const { error } = await supabase
    .from('categories')
    .update({ name, slug })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
