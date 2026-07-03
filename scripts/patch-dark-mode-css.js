/**
 * Converts Tailwind media-query dark mode to class-based (html.dark) toggling.
 */
const fs = require('fs');
const path = require('path');

function transformDarkBlock(block) {
  let result = '';
  let i = 0;

  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) i++;
    if (i >= block.length) break;

    const braceOpen = block.indexOf('{', i);
    if (braceOpen === -1) break;

    const selector = block.slice(i, braceOpen).trim();
    let depth = 1;
    let j = braceOpen + 1;
    while (depth > 0 && j < block.length) {
      if (block[j] === '{') depth++;
      else if (block[j] === '}') depth--;
      j++;
    }

    const rule = block.slice(braceOpen, j);
    result += `html.dark ${selector}${rule}`;
    i = j;
  }

  return result;
}

function patchCss(css) {
  const mediaRe = /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{/g;
  let match;
  let lastIndex = 0;
  let output = '';

  while ((match = mediaRe.exec(css)) !== null) {
    output += css.slice(lastIndex, match.index);

    let depth = 1;
    let i = match.index + match[0].length;
    const blockStart = i;
    while (depth > 0 && i < css.length) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }

    const blockContent = css.slice(blockStart, i - 1);
    output += transformDarkBlock(blockContent);
    lastIndex = i;
  }

  output += css.slice(lastIndex);
  return output;
}

const targets = [
  path.join(__dirname, '../server/public/assets/index-DLm6wJYy.css'),
];

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.warn('Skip missing:', file);
    continue;
  }
  const original = fs.readFileSync(file, 'utf8');
  const patched = patchCss(original);
  fs.writeFileSync(file, patched, 'utf8');
  console.log('Patched:', file);
}
