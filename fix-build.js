const fs = require('fs');
let code = fs.readFileSync('app/dashboard/cours/page.tsx', 'utf8');
code = code.replace(/dangerouslySetInnerHTML={{ __html: typeBadge\(item\.type\) }}/g, "");
fs.writeFileSync('app/dashboard/cours/page.tsx', code);
