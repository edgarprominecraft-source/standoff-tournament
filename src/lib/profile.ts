import { supabase } from '../supabase';

// Цвета ников (10 вариантов)
export const NICK_COLORS = [
  { id: 'white', value: '#0A0A0A', name: 'Чёрный', price: 0 },
  { id: 'orange', value: '#FF6B00', name: 'Оранжевый', price: 100 },
  { id: 'red', value: '#FF3B30', name: 'Красный', price: 200 },
  { id: 'green', value: '#34C759', name: 'Зелёный', price: 200 },
  { id: 'blue', value: '#2563EB', name: 'Синий', price: 200 },
  { id: 'purple', value: '#8B5CF6', name: 'Фиолетовый', price: 300 },
  { id: 'pink', value: '#EC4899', name: 'Розовый', price: 300 },
  { id: 'gold', value: '#FFD700', name: 'Золотой', price: 500 },
  { id: 'cyan', value: '#06B6D4', name: 'Голубой', price: 300 },
  { id: 'rainbow', value: 'rainbow', name: 'Радужный', price: 1000 },
];

// Рамки аватара
export const AVATAR_FRAMES = [
  { id: 'none', name: 'Без рамки', price: 0, style: '' },
  { id: 'bronze', name: 'Бронза', price: 200, style: 'ring-2 ring-amber-600' },
  { id: 'silver', name: 'Серебро', price: 400, style: 'ring-2 ring-gray-400' },
  { id: 'gold', name: 'Золото', price: 800, style: 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.6)]' },
  { id: 'fire', name: 'Огонь', price: 1500, style: 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(255,107,0,0.7)]' },
  { id: 'legend', name: 'Легенда', price: 3000, style: 'ring-2 ring-purple-500 shadow-[0_0_24px_rgba(139,92,246,0.8)]' },
];

// Фоны профиля (градиенты)
export const PROFILE_BANNERS = [
  { id: 'none', name: 'Простой', price: 0, css: 'bg-gradient-to-br from-bg2 to-bg3' },
  { id: 'sunset', name: 'Закат', price: 300, css: 'bg-gradient-to-br from-orange-400 via-red-400 to-pink-500' },
  { id: 'ocean', name: 'Океан', price: 300, css: 'bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400' },
  { id: 'forest', name: 'Лес', price: 300, css: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500' },
  { id: 'purple', name: 'Фиолет', price: 500, css: 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' },
  { id: 'gold', name: 'Золото', price: 1000, css: 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500' },
];

// Обновление полей профиля
export async function updateProfile(userId: number, fields: any) {
  const { data, error } = await supabase
    .from('users')
    .update(fields)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
}

// Загрузка аватара в Supabase Storage
export async function uploadAvatar(userId: number, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `avatars/${userId}.${ext}`;

  const { error } = await supabase.storage
    .from('standoff')
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (error) {
    console.error('upload avatar error:', error);
    return null;
  }

  const { data } = supabase.storage.from('standoff').getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
}

// Загрузка баннера
export async function uploadBanner(userId: number, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `banners/${userId}.${ext}`;

  const { error } = await supabase.storage
    .from('standoff')
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (error) {
    console.error('upload banner error:', error);
    return null;
  }

  const { data } = supabase.storage.from('standoff').getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
}

// Статистика игрока
export async function getPlayerStats(userId: number) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
    .eq('status', 'done');

  return matches || [];
}