import { parseDiagram, type DiagramToken } from '@contikids/shared';
import pig from '../assets/waddles-pig.png';
import { Emoji } from '../components/Emoji';

const labelColors = { green: 'bg-green', red: 'bg-[#ffaaaa]', blue: 'bg-[#a6cbf5]' };

function Symbol({ token }: { token: DiagramToken }) {
  switch (token.kind) {
    case 'arrow':
      return (
        <span aria-label="hacia" role="img">
          →
        </span>
      );
    case 'pig':
      return (
        <img src={pig} alt="Alcancía" width={38} height={38} className="size-10 object-contain" />
      );
    case 'coin':
      return (
        <span className="inline-flex items-center gap-1">
          {token.amount}
          <span
            role="img"
            aria-label="Moneda Waddles"
            className="grid size-8 place-items-center rounded-full border-2 border-yellow-shadow bg-yellow shadow-sm"
          >
            <img src={pig} alt="" width={19} height={19} className="size-5 object-contain" />
          </span>
        </span>
      );
    case 'label':
      return (
        <span
          className={`max-w-full rounded-full px-3 py-1 font-display text-sm font-extrabold ${labelColors[token.color]}`}
        >
          {token.text}
        </span>
      );
    case 'emoji':
      return <Emoji symbol={token.text} />;
    case 'text':
      return <span>{token.text}</span>;
  }
}

export function Diagram({ text }: { text: string }) {
  return (
    <figure
      aria-label="Diagrama de la lección"
      className="card-game flex min-h-28 flex-wrap items-center justify-center gap-2 text-xl [overflow-wrap:anywhere]"
    >
      {parseDiagram(text).map((token, i) => (
        <Symbol key={i} token={token} />
      ))}
    </figure>
  );
}
