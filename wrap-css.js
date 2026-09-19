const fs = require('fs');

let css = fs.readFileSync('/tmp/target_style.css', 'utf8');

// A very naive prefixing for demonstration.
// Better: just output it as is, but we want to avoid global styles.
// Actually, why not just remove html and body styling from it, 
// and wrap the rest in a <div id="ujlog-theme">...</div>?
// Since it uses BEM-like or specific classes (like .navbar, .card), 
// they won't conflict with our Tailwind classes much!
// Let's just remove html, body, *, a, button generic selectors.

css = css.replace(/\*,\s*\*::before,\s*\*::after\s*\{[^}]+\}/g, '');
css = css.replace(/html\s*\{[^}]+\}/g, '');
css = css.replace(/body\s*\{([^}]+)\}/g, '.ujlog-courses-theme { $1 }');
css = css.replace(/^a\s*\{([^}]+)\}/gm, '.ujlog-courses-theme a { $1 }');
css = css.replace(/^button\s*\{([^}]+)\}/gm, '.ujlog-courses-theme button { $1 }');
css = css.replace(/::-webkit-scrollbar/g, '.ujlog-courses-theme::-webkit-scrollbar');

fs.writeFileSync('app/dashboard/cours/theme.css', css);
console.log('CSS processed');
