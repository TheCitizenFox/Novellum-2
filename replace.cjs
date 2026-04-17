const fs = require('fs');
const path = require('path');

const replacements = {
  '#121214': '#15151A',
  '#18181b': '#1C1C24',
  '#27272a': '#252530',
  '#3f3f46': '#2D2D3A',
  '#a1a1aa': '#9E9EA8',
  '#ff6b35': '#8B7BFF',
  '#ff8c42': '#A296FF'
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
      if (file.match(/\.(tsx|ts|css|html)$/)) {
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
    const regex = new RegExp(oldVal, 'gi');
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
