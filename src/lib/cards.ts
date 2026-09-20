// Все карты Standoff 2 для пик/бан системы

export type GameMap = {
  id: string;
  name: string;
  mode: 'defuse' | 'ctf' | 'arena';
  image: string; // путь к картинке (позже заменим на локальные)
};

export const MAPS: GameMap[] = [
  { id: 'sandstone', name: 'Sandstone', mode: 'defuse', image: '' },
  { id: 'rust', name: 'Rust', mode: 'defuse', image: '' },
  { id: 'province', name: 'Province', mode: 'defuse', image: '' },
  { id: 'zone9', name: 'Zone 9', mode: 'defuse', image: '' },
  { id: 'breeze', name: 'Breeze', mode: 'defuse', image: '' },
  { id: 'dune', name: 'Dune', mode: 'defuse', image: '' },
  { id: 'soar', name: 'Soar', mode: 'defuse', image: '' },
];

// Порядок пик/бана для Bo1 (одна карта)
// 1. Team 1 ban
// 2. Team 2 ban
// 3. Team 1 ban
// 4. Team 2 ban
// 5. Team 1 ban
// 6. Team 2 ban
// 7. Остаётся 1 карта — на ней играют
export const BO1_SEQUENCE: { team: 1 | 2; action: 'ban' | 'pick' }[] = [
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
];

// Получить карту по id
export function getMap(id: string): GameMap | undefined {
  return MAPS.find((m) => m.id === id);
}