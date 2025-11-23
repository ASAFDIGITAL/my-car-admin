# הגדרת הפרויקט במחשב המקומי (VSCode)

## שלב 1: משיכת הפרויקט מ-GitHub

### דרך א': דרך VSCode
1. פתח VSCode
2. לחץ על `Ctrl+Shift+P` (או `Cmd+Shift+P` במק)
3. הקלד `Git: Clone` ובחר באפשרות
4. הדבק את הכתובת: `https://github.com/ASAFDIGITAL/my-car-admin`
5. בחר תיקייה איפה לשמור את הפרויקט
6. לחץ על "Open" כשזה שואל אם לפתוח את הפרויקט

### דרך ב': דרך טרמינל
```bash
# פתח טרמינל והרץ:
git clone https://github.com/ASAFDIGITAL/my-car-admin.git
cd my-car-admin

# פתח ב-VSCode:
code .
```

## שלב 2: התקנת החבילות

פתח טרמינל ב-VSCode (`Ctrl+` ` או Terminal > New Terminal) והרץ:

```bash
npm install
```

זה יתקין את כל החבילות הנדרשות מ-`package.json`.

## שלב 3: הגדרת משתני הסביבה (.env)

**צור קובץ `.env`** בשורש הפרויקט עם התוכן הבא:

```env
VITE_SUPABASE_PROJECT_ID=prqvohcuhvzokfqodmfe
VITE_SUPABASE_URL=https://prqvohcuhvzokfqodmfe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXZvaGN1aHZ6b2tmcW9kbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzQ4NjksImV4cCI6MjA3OTQ1MDg2OX0.xdGpDQpG9xFs9S96saGL7pG2-gWhpZaquZHXUhGM5Pg
```

**חשוב:** הקובץ `.env` כבר מופיע ב-`.gitignore` ולא יועלה ל-GitHub (למען הביטחון).

## שלב 4: הריצה המקומית

הרץ את הפקודה הבאה בטרמינל:

```bash
npm run dev
```

זה יפעיל את שרת הפיתוח ויפתח את האפליקציה ב-`http://localhost:8080`

## מבנה הפרויקט

```
my-car-admin/
├── src/
│   ├── components/      # קומפוננטות
│   ├── pages/          # דפים (Cars, Sales, Dashboard וכו')
│   ├── integrations/   # חיבור ל-Supabase
│   └── main.tsx        # נקודת הכניסה
├── supabase/
│   ├── functions/      # Edge Functions (wordpress-sync, wordpress-push)
│   └── config.toml     # הגדרות Supabase
├── public/            # קבצים סטטיים
├── .env              # משתני סביבה (יש ליצור!)
└── package.json      # תלויות
```

## מסד הנתונים (Supabase)

**אתה כבר מחובר למסד נתונים קיים!** 

המידע נמצא בפרויקט Supabase שכבר מוגדר:
- Project ID: `prqvohcuhvzokfqodmfe`
- URL: `https://prqvohcuhvzokfqodmfe.supabase.co`

### הטבלאות במסד הנתונים:
- `cars` - רכבים
- `car_images` - תמונות רכבים
- `sales` - מכירות
- `companies` - יצרנים
- `car_types` - סוגי רכבים
- `car_years` - שנות ייצור
- `profiles` - פרופילי משתמשים
- `user_roles` - הרשאות משתמשים

**אין צורך בהתקנה מקומית של מסד נתונים** - הכל עובד עם Supabase בענן.

## פקודות שימושיות

```bash
# הרצת שרת פיתוח
npm run dev

# בניית הפרויקט לייצור
npm run build

# תצוגה מקדימה של הבנייה
npm run preview

# בדיקת TypeScript
npm run type-check

# Lint
npm run lint
```

## עבודה עם Git

```bash
# משיכת שינויים מ-GitHub
git pull

# הוספת שינויים
git add .

# יצירת commit
git commit -m "תיאור השינויים"

# העלאה ל-GitHub
git push
```

**שים לב:** שינויים ב-GitHub יסתנכרנו אוטומטית חזרה ל-Lovable!

## טיפול בבעיות נפוצות

### הפרויקט לא מתחיל
1. וודא שהתקנת Node.js (גרסה 16 ומעלה)
2. מחק את `node_modules` והרץ `npm install` שוב
3. וודא שהקובץ `.env` קיים ומכיל את כל המשתנים

### שגיאות TypeScript
```bash
npm run type-check
```

### בעיות עם Supabase
- וודא שה-API Key נכון בקובץ `.env`
- בדוק שאתה מחובר לאינטרנט
- בדוק ב-Console של הדפדפן אם יש שגיאות

### Edge Functions לא עובדות מקומית
Edge Functions רצות רק ב-Supabase. לפיתוח מקומי תצטרך:
```bash
# התקן Supabase CLI
npm install -g supabase

# התחבר לפרויקט
supabase login
supabase link --project-ref prqvohcuhvzokfqodmfe

# הרץ Edge Functions מקומית
supabase functions serve
```

## סביבת עבודה מומלצת

### תוספים מומלצים ל-VSCode:
- ESLint
- Prettier
- TypeScript + JavaScript
- Tailwind CSS IntelliSense
- GitLens
- ES7+ React/Redux/React-Native snippets

### הגדרות VSCode מומלצות:
הוסף ל-`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## עזרה נוספת

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## תמיכה

אם יש בעיות, בדוק:
1. Console של הדפדפן (F12)
2. טרמינל של VSCode לשגיאות
3. Network tab בדפדפן לבעיות בקריאות API
