import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { en } from './locales/en';

const SRC = resolve(process.cwd(), 'src');
const WORDS = /[A-Za-z]{2}/;
const COPY_ATTRIBUTES = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'description', 'kicker']);
const COPY_PROPERTIES = new Set(['message', 'title', 'label', 'description']);
// A comparison such as step === 'upload' renders a boolean, never its operands.
const RENDERING_OPERATORS = new Set([
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.PlusToken,
]);

// Not language: a literal here must be the same in every locale. Keep each entry
// as `path: text` so an unrelated literal in the same file still fails.
const ALLOWED = new Set([
  'components/settings/ApiKeySettings.tsx: AIzaSy...',
  'main.tsx: @keyframes spin { to { transform: rotate(360deg); } }',
]);

const collectPages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : collectPages(path);
    return /\.tsx$/.test(path) && !/\.test\.tsx$/.test(path) ? [path] : [];
  });

const literalText = (node: ts.Node): string | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
  }
  return undefined;
};

/** Literal branches of a value, so `a ? 'Yes' : t('no')` still reports 'Yes'. */
const copyLeaves = (node: ts.Node): string[] => {
  if (ts.isParenthesizedExpression(node) || ts.isJsxExpression(node)) {
    return node.expression ? copyLeaves(node.expression) : [];
  }
  if (ts.isConditionalExpression(node)) {
    return [...copyLeaves(node.whenTrue), ...copyLeaves(node.whenFalse)];
  }
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return copyLeaves(node.right);
    return RENDERING_OPERATORS.has(operator)
      ? [...copyLeaves(node.left), ...copyLeaves(node.right)]
      : [];
  }
  const text = literalText(node);
  return text === undefined ? [] : [text];
};

/** The visible English a component renders without going through a catalog. */
export const findLiterals = (source: string): string[] => {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) found.push(node.text.trim());
    if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) found.push(...copyLeaves(node));
    if (ts.isJsxAttribute(node) && COPY_ATTRIBUTES.has(node.name.getText()) && node.initializer) {
      found.push(...copyLeaves(node.initializer));
    }
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      COPY_PROPERTIES.has(node.name.text)
    ) {
      found.push(...copyLeaves(node.initializer));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  // A catalog key held in data, such as { title: 'tour.step1.title' }, is a lookup.
  return found.filter((text) => WORDS.test(text) && !Object.hasOwn(en, text));
};

describe('user-visible literals', () => {
  it('keeps every component string in the locale files', () => {
    const offenders = collectPages(SRC).flatMap((path) => {
      const name = relative(SRC, path).split(sep).join('/');
      return findLiterals(readFileSync(path, 'utf8'))
        .map((text) => `${name}: ${text}`)
        .filter((entry) => !ALLOWED.has(entry));
    });
    expect(offenders).toEqual([]);
  });

  it('reports each way a literal can reach the screen', () => {
    const source = `const a = (
      <p aria-label="Close" title={busy ? 'Saving' : t('idle')}>
        Plain text
        {count > 0 ? 'Some' : t('none')}
        {showToast({ message: \`Loaded \${name}\` })}
      </p>
    );`;
    expect(findLiterals(source)).toEqual(['Close', 'Saving', 'Plain text', 'Some', 'Loaded  ']);
  });

  it('ignores catalog lookups, class names and bare symbols', () => {
    const source = `const a = (
      <p className="flex gap-2" aria-label={t('close')} title={label}>
        {t('body', { name })} · 42
        {show({ title: 'tour.step1.title' })}
      </p>
    );`;
    expect(findLiterals(source)).toEqual([]);
  });
});
