// Rendu du contenu balisé d'un sermon : <verset>, <hadith>, <titre>.
// Les couleurs s'adaptent au thème du lecteur (clair / sombre / sépia)
// pour rester douces pour les yeux. Le texte brut reste compatible.

export type ReaderTheme = 'light' | 'dark' | 'sepia';

type BlockType = 'text' | 'verset' | 'hadith' | 'titre';

interface Block {
  type: BlockType;
  text: string;
}

const TAG_RE = /<(verset|hadith|titre)>([\s\S]*?)<\/\1>/g;
const ARABIC_RE = /[؀-ۿݐ-ݿ]/;

export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let lastIndex = 0;
  for (const m of content.matchAll(TAG_RE)) {
    const before = content.slice(lastIndex, m.index).trim();
    if (before) blocks.push({ type: 'text', text: before });
    blocks.push({ type: m[1] as BlockType, text: m[2].trim() });
    lastIndex = m.index! + m[0].length;
  }
  const rest = content.slice(lastIndex).trim();
  if (rest) blocks.push({ type: 'text', text: rest });
  return blocks;
}

// Titres des grandes sections (pour le sommaire flottant)
export function extractSections(content: string): string[] {
  return parseBlocks(content)
    .filter((b) => b.type === 'titre')
    .map((b) => b.text);
}

const versetColors: Record<ReaderTheme, string> = {
  light: 'text-red-700',
  dark: 'text-red-300',
  sepia: 'text-red-800',
};

const hadithColors: Record<ReaderTheme, string> = {
  light: 'text-blue-700 border-blue-200',
  dark: 'text-blue-300 border-blue-800',
  sepia: 'text-blue-800 border-blue-300',
};

interface SermonContentProps {
  content: string;
  theme: ReaderTheme;
  dir: 'rtl' | 'ltr';
}

export default function SermonContent({ content, theme, dir }: SermonContentProps) {
  const blocks = parseBlocks(content);
  let sectionIndex = -1;

  return (
    <div dir={dir} style={{ lineHeight: 1.6 }}>
      {blocks.map((block, i) => {
        if (block.type === 'titre') {
          sectionIndex++;
          return (
            <h3 id={`section-${sectionIndex}`} key={i} className="font-bold text-[1.1em] mt-6 mb-2 scroll-mt-24">
              {block.text}
            </h3>
          );
        }
        if (block.type === 'verset') {
          const arabic = ARABIC_RE.test(block.text);
          return (
            <p
              key={i}
              dir={arabic ? 'rtl' : dir}
              className={`${versetColors[theme]} text-[1.15em] my-4 ${arabic ? 'text-right font-serif leading-loose' : ''}`}
            >
              {block.text}
            </p>
          );
        }
        if (block.type === 'hadith') {
          return (
            <p
              key={i}
              dir={ARABIC_RE.test(block.text) ? 'rtl' : dir}
              className={`${hadithColors[theme]} border-s-2 ps-3 my-4 italic`}
            >
              {block.text}
            </p>
          );
        }
        // Texte normal : un paragraphe par ligne
        return block.text
          .split(/\n+/)
          .filter((p) => p.trim())
          .map((para, j) => (
            <p key={`${i}-${j}`} className="my-3">
              {para}
            </p>
          ));
      })}
    </div>
  );
}
