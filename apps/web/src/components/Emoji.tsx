import gift from '../assets/emoji/1f381.svg';
import iceCream from '../assets/emoji/1f366.svg';
import seedling from '../assets/emoji/1f331.svg';
import grandma from '../assets/emoji/1f475.svg';
import backpack from '../assets/emoji/1f392.svg';
import apple from '../assets/emoji/1f34e.svg';

const icons: Record<string, [string, string]> = {
  '🎁': [gift, 'Regalo'],
  '🍦': [iceCream, 'Helado'],
  '🌱': [seedling, 'Brote'],
  '👵': [grandma, 'Abuela'],
  '🎒': [backpack, 'Mochila'],
  '🍎': [apple, 'Manzana'],
};

export function Emoji({ symbol, decorative = false }: { symbol: string; decorative?: boolean }) {
  const icon = icons[symbol.replaceAll('\uFE0F', '')];
  if (!icon) return <span>{symbol}</span>;
  return (
    <img
      src={icon[0]}
      alt={decorative ? '' : icon[1]}
      className="inline-block size-[1.45em] object-contain"
    />
  );
}
