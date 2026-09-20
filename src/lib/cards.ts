export type GameMap = {
  id: string;
  name: string;
  mode: 'defuse' | 'ctf' | 'arena';
  gradient: string; // CSS-класс для фона
  accent: string;   // hex-цвет акцента
};

export const MAPS: GameMap[] = [
  { id: 'sandstone', name: 'Sandstone', mode: 'defuse', gradient: 'map-gradient-sandstone', accent: '#C9A961' },
  { id: 'rust', name: 'Rust', mode: 'defuse', gradient: 'map-gradient-rust', accent: '#B86636' },
  { id: 'province', name: 'Province', mode: 'defuse', gradient: 'map-gradient-province', accent: '#4A7C59' },
  { id: 'zone9', name: 'Zone 9', mode: 'defuse', gradient: 'map-gradient-zone9', accent: '#4A6FA5' },
  { id: 'breeze', name: 'Breeze', mode: 'defuse', gradient: 'map-gradient-breeze', accent: '#6BA3C0' },
  { id: 'dune', name: 'Dune', mode: 'defuse', gradient: 'map-gradient-dune', accent: '#DAA520' },
  { id: 'soar', name: 'Soar', mode: 'defuse', gradient: 'map-gradient-soar', accent: '#7A7AA0' },
];

export const BO1_SEQUENCE: { team: 1 | 2; action: 'ban' | 'pick' }[] = [
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
  { team: 1, action: 'ban' },
  { team: 2, action: 'ban' },
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find((m) => m.id === id);
}