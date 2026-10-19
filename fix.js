const fs = require('fs');
let code = fs.readFileSync('app/dashboard/cours/page.tsx', 'utf8');
code = code.replace(/const mockCourses = [^]+?\n\nfunction CoursesContent/m, "const mockCourses: any[] = [];\n\nfunction CoursesContent");
fs.writeFileSync('app/dashboard/cours/page.tsx', code);
