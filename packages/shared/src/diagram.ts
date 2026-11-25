export type DiagramToken =
  | { kind: 'arrow' | 'pig' }
  | { kind: 'coin'; amount?: string }
  | { kind: 'label'; color: 'green' | 'red' | 'blue'; text: string }
  | { kind: 'emoji' | 'text'; text: string };

const colors = { g: 'green', r: 'red', b: 'blue' } as const;

/** Lee la notación del prototipo sin interpretar HTML ni expandir N monedas en N nodos. */
export function parseDiagram(text: string): DiagramToken[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const tokens: DiagramToken[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (word === '>') tokens.push({ kind: 'arrow' });
    else if (word === 'PIG') tokens.push({ kind: 'pig' });
    else if (word === 'COIN') tokens.push({ kind: 'coin' });
    else if (/^\d+$/.test(word) && words[i + 1] === 'COIN') {
      tokens.push({ kind: 'coin', amount: word });
      i++;
    } else if (/^@[grb].+/.test(word)) {
      const color = colors[word[1] as keyof typeof colors];
      tokens.push({ kind: 'label', color, text: word.slice(2).replaceAll('_', ' ') });
    } else {
      const emoji = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u.test(word);
      tokens.push({ kind: emoji ? 'emoji' : 'text', text: word.replaceAll('_', ' ') });
    }
  }
  return tokens;
}
