// Звания Standoff 2 — с картинками из /public/ranks/

export type Rank = {
  id: string;
  name: string;
  shortName: string;
  color: string;       // цвет для текста/обводки
  bg: string;          // фон плашки
  image: string;       // путь к картинке медали
  level: number;       // числовой уровень (для сортировки)
};

export const RANKS: Rank[] = [
  // Бронза
  { id: 'bronze_1', name: 'Бронза I', shortName: 'Бр I', color: '#8B5A2B', bg: 'linear-gradient(135deg, #8B5A2B 0%, #A67C52 100%)', image: '/ranks/medals_standoff2_154.webp', level: 1 },
  { id: 'bronze_2', name: 'Бронза II', shortName: 'Бр II', color: '#8B5A2B', bg: 'linear-gradient(135deg, #8B5A2B 0%, #A67C52 100%)', image: '/ranks/medals_standoff2_155.webp', level: 2 },
  { id: 'bronze_3', name: 'Бронза III', shortName: 'Бр III', color: '#8B5A2B', bg: 'linear-gradient(135deg, #8B5A2B 0%, #A67C52 100%)', image: '/ranks/medals_standoff2_156.webp', level: 3 },
  { id: 'bronze_4', name: 'Бронза IV', shortName: 'Бр IV', color: '#8B5A2B', bg: 'linear-gradient(135deg, #8B5A2B 0%, #A67C52 100%)', image: '/ranks/medals_standoff2_157.webp', level: 4 },

  // Серебро
  { id: 'silver_1', name: 'Серебро I', shortName: 'Ср I', color: '#7A8A99', bg: 'linear-gradient(135deg, #A8B4C0 0%, #D0D8E0 100%)', image: '/ranks/medals_standoff2_158.webp', level: 5 },
  { id: 'silver_2', name: 'Серебро II', shortName: 'Ср II', color: '#7A8A99', bg: 'linear-gradient(135deg, #A8B4C0 0%, #D0D8E0 100%)', image: '/ranks/medals_standoff2_159.webp', level: 6 },
  { id: 'silver_3', name: 'Серебро III', shortName: 'Ср III', color: '#7A8A99', bg: 'linear-gradient(135deg, #A8B4C0 0%, #D0D8E0 100%)', image: '/ranks/medals_standoff2_160.webp', level: 7 },
  { id: 'silver_4', name: 'Серебро IV', shortName: 'Ср IV', color: '#7A8A99', bg: 'linear-gradient(135deg, #A8B4C0 0%, #D0D8E0 100%)', image: '/ranks/medals_standoff2_161.webp', level: 8 },

  // Золото
  { id: 'gold_1', name: 'Золото I', shortName: 'Зл I', color: '#B8860B', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', image: '/ranks/medals_standoff2_162.webp', level: 9 },
  { id: 'gold_2', name: 'Золото II', shortName: 'Зл II', color: '#B8860B', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', image: '/ranks/medals_standoff2_163.webp', level: 10 },
  { id: 'gold_3', name: 'Золото III', shortName: 'Зл III', color: '#B8860B', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', image: '/ranks/medals_standoff2_164.webp', level: 11 },
  { id: 'gold_4', name: 'Золото IV', shortName: 'Зл IV', color: '#B8860B', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', image: '/ranks/medals_standoff2_165.webp', level: 12 },

  // Высшие звания
  { id: 'phoenix', name: 'Феникс', shortName: 'Фн', color: '#FF6B00', bg: 'linear-gradient(135deg, #FF8A2B 0%, #FF4500 100%)', image: '/ranks/medals_standoff2_166.webp', level: 13 },
  { id: 'ranger', name: 'Рейнджер', shortName: 'Рн', color: '#2563EB', bg: 'linear-gradient(135deg, #4A9EFF 0%, #1E40AF 100%)', image: '/ranks/medals_standoff2_167.webp', level: 14 },
  { id: 'champion', name: 'Чемпион', shortName: 'Чм', color: '#DC2626', bg: 'linear-gradient(135deg, #EF4444 0%, #991B1B 100%)', image: '/ranks/medals_standoff2_168.webp', level: 15 },
  { id: 'master', name: 'Мастер', shortName: 'Мс', color: '#8B5CF6', bg: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)', image: '/ranks/medals_standoff2_169.webp', level: 16 },
];

export function getRank(id: string | null | undefined): Rank | null {
  if (!id) return null;
  return RANKS.find((r) => r.id === id) || null;
}

export function rankLevel(id: string | null | undefined): number {
  const r = getRank(id);
  return r?.level ?? 0;
}