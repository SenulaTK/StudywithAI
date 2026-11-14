'use client';

import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';

interface RichAcademicTextProps {
  text: string;
  className?: string;
}

/**
 * Renders academic text containing inline KaTeX ($...$ or \(...\)),
 * block KaTeX ($$...$$ or \[...\]), **bold**, *italic*, and `code` spans.
 */
export function RichAcademicText({
  text,
  className = '',
}: RichAcademicTextProps) {
  if (!text) return null;

  // Split by block math first: $$...$$ or \[...\]
  const blockSegments = text.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g);

  return (
    <span className={className}>
      {blockSegments.map((segment, idx) => {
        if (
          (segment.startsWith('$$') && segment.endsWith('$$')) ||
          (segment.startsWith('\\[') && segment.endsWith('\\]'))
        ) {
          const math = segment.slice(2, -2).trim();
          if (!math) return null;
          return (
            <span
              key={idx}
              className="block my-2 py-1.5 px-2.5 rounded-lg bg-black/5 overflow-x-auto text-center"
            >
              <BlockMath
                math={math}
                renderError={() => (
                  <code className="font-mono text-xs">{math}</code>
                )}
              />
            </span>
          );
        }

        return <InlineFormattedSegment key={idx} text={segment} />;
      })}
    </span>
  );
}

function InlineFormattedSegment({ text }: { text: string }) {
  // Split inline math: $...$ (non-empty, single line) or \(...\)
  const tokens = text.split(
    /(\$[^$\n]+?\$|\\\([\s\S]+?\\\)|`[^`\n]+`|\*\*[^*\n]+\*\*)/g
  );

  return (
    <>
      {tokens.map((tok, i) => {
        if (!tok) return null;

        if (tok.startsWith('$') && tok.endsWith('$') && tok.length > 2) {
          const math = tok.slice(1, -1).trim();
          return (
            <span key={i} className="inline-block mx-0.5 align-middle">
              <InlineMath
                math={math}
                renderError={() => (
                  <code className="font-mono text-xs">{math}</code>
                )}
              />
            </span>
          );
        }

        if (tok.startsWith('\\(') && tok.endsWith('\\)') && tok.length > 4) {
          const math = tok.slice(2, -2).trim();
          return (
            <span key={i} className="inline-block mx-0.5 align-middle">
              <InlineMath
                math={math}
                renderError={() => (
                  <code className="font-mono text-xs">{math}</code>
                )}
              />
            </span>
          );
        }

        if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
          return (
            <strong key={i} className="font-bold">
              {tok.slice(2, -2)}
            </strong>
          );
        }

        if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-black/10 font-mono text-[0.92em]"
            >
              {tok.slice(1, -1)}
            </code>
          );
        }

        return <React.Fragment key={i}>{tok}</React.Fragment>;
      })}
    </>
  );
}
