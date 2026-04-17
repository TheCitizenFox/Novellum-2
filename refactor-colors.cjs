const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-[#15151A]': 'bg-bg-main',
  'bg-[#1C1C24]': 'bg-bg-panel',
  'bg-[#252530]': 'bg-bg-card',
  'bg-[#2D2D3A]': 'bg-bg-hover',
  'hover:bg-[#1C1C24]': 'hover:bg-bg-panel',
  'hover:bg-[#252530]': 'hover:bg-bg-card',
  'hover:bg-[#2D2D3A]': 'hover:bg-bg-hover',
  'text-[#9E9EA8]': 'text-text-muted',
  'text-[#8B7BFF]': 'text-accent-primary',
  'text-[#A296FF]': 'text-accent-hover',
  'hover:text-[#8B7BFF]': 'hover:text-accent-primary',
  'hover:text-[#A296FF]': 'hover:text-accent-hover',
  'border-[#1C1C24]': 'border-bg-panel',
  'border-[#252530]': 'border-bg-card',
  'border-[#2D2D3A]': 'border-bg-hover',
  'from-[#8B7BFF]': 'from-accent-primary',
  'to-[#A296FF]': 'to-accent-hover',
  'fill-[#8B7BFF]': 'fill-accent-primary',
  'shadow-[0_0_20px_rgba(139,123,255,0.4)]': 'shadow-[0_0_20px_var(--shadow-accent)]',
  'shadow-[0_0_40px_rgba(139,123,255,0.3)]': 'shadow-[0_0_40px_var(--shadow-accent)]',
  'border-[rgba(255,107,53,0.2)]': 'border-accent-primary/20',
  'hover:border-[rgba(255,107,53,0.5)]': 'hover:border-accent-primary/50',
  'hover:bg-[rgba(255,107,53,0.05)]': 'hover:bg-accent-primary/5',
  'bg-[#121214]': 'bg-bg-main',
  'bg-[#18181b]': 'bg-bg-panel',
  'bg-[#27272a]': 'bg-bg-card',
  'bg-[#3f3f46]': 'bg-bg-hover',
  'text-[#a1a1aa]': 'text-text-muted',
  'text-[#ff6b35]': 'text-accent-primary',
  'text-[#ff8c42]': 'text-accent-hover',
  '#15151A': 'var(--bg-main)',
  '#1C1C24': 'var(--bg-panel)',
  '#252530': 'var(--bg-card)',
  '#2D2D3A': 'var(--bg-hover)',
  '#9E9EA8': 'var(--text-muted)',
  '#8B7BFF': 'var(--accent-primary)',
  '#A296FF': 'var(--accent-hover)'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.match(/\.(tsx|ts|html)$/)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('src'), 'index.html', 'vite.config.ts'];
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [oldVal, newVal] of Object.entries(replacements)) {
    // Escape brackets for regex
    const escapedOldVal = oldVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedOldVal, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, newVal);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
