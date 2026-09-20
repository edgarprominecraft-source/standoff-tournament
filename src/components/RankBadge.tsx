import { motion } from 'framer-motion';
import { getRank } from '../lib/ranks';

type Props = {
  rankId: string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
};

const SIZES = {
  sm: { box: 'h-6 px-1.5', img: 'w-4 h-4', name: 'text-[9px]' },
  md: { box: 'h-7 px-2', img: 'w-5 h-5', name: 'text-[10px]' },
  lg: { box: 'h-9 px-3', img: 'w-6 h-6', name: 'text-xs' },
  xl: { box: 'h-11 px-4', img: 'w-8 h-8', name: 'text-sm' },
};

export default function RankBadge({ rankId, size = 'md', showName = true }: Props) {
  const rank = getRank(rankId);
  if (!rank) return null;

  const s = SIZES[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-md font-black text-white shadow-sm ${s.box}`}
      style={{ background: rank.bg }}
      title={rank.name}
    >
      <img src={rank.image} alt={rank.name} className={`${s.img} object-contain`} />
      {showName && <span className={`${s.name} tracking-wide`}>{rank.shortName}</span>}
    </motion.div>
  );
}