# הוראות העלאה לשרת Hostinger

## שלב 1: בניית הפרויקט

בטרמינל במחשב המקומי שלך, הרץ את הפקודות הבאות:

```bash
# התקן את החבילות הנדרשות
npm install

# בנה את הפרויקט
npm run build
```

זה יצור תיקייה בשם `dist` עם כל הקבצים המוכנים לשרת.

## שלב 2: יצירת קובץ .env בשרת

צור קובץ בשם `.env` בתיקיית `/trade/` בשרת עם התוכן הבא:

```
VITE_SUPABASE_PROJECT_ID="prqvohcuhvzokfqodmfe"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXZvaGN1aHZ6b2tmcW9kbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzQ4NjksImV4cCI6MjA3OTQ1MDg2OX0.xdGpDQpG9xFs9S96saGL7pG2-gWhpZaquZHXUhGM5Pg"
VITE_SUPABASE_URL="https://prqvohcuhvzokfqodmfe.supabase.co"
```

**שים לב:** משתני סביבה של Vite נבנים בזמן הבילד, אז צריך לבנות מחדש אחרי שמוסיפים את הקובץ!

## שלב 3: העלאת הקבצים לשרת

1. **מחק את כל הקבצים** שכרגע נמצאים בתיקייה `/trade/` בשרת
2. **העלה רק את התוכן של תיקיית `dist`** (לא את התיקייה עצמה - רק את התוכן שבתוכה)
3. וודא שהקובץ `.htaccess` הועלה (לפעמים קבצים מוסתרים לא מועתקים אוטומטית)

המבנה הסופי בשרת צריך להיראות כך:
```
/public_html/trade/
  ├── .htaccess
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js
  │   ├── index-[hash].css
  │   └── ...
  └── robots.txt
```

## שלב 4: הגדרות שרת נוספות

### ב-Hostinger File Manager או cPanel:

1. וודא ש-Apache mod_rewrite מופעל
2. וודא שזכויות הקבצים נכונות:
   - קבצים: 644
   - תיקיות: 755

## בדיקה

פתח בדפדפן:
```
https://srv1382-files.hstgr.io/trade/
```

או אם יש לך דומיין:
```
https://trade.walid-group.co.il/
```

## פתרון בעיות נפוצות

### מסך לבן
- וודא שהעלית את תיקיית `dist` ולא את קבצי המקור
- בדוק שהקובץ `.htaccess` קיים
- בדוק את ה-Console בדפדפן לשגיאות

### שגיאות 404 על קבצי CSS/JS
- וודא שה-base path מוגדר נכון ב-`vite.config.ts`
- בנה מחדש את הפרויקט

### בעיות בניווט (רענון עמוד)
- וודא שהקובץ `.htaccess` עובד
- בדוק שמודול mod_rewrite מופעל בשרת

### שגיאות חיבור למסד נתונים
- וודא שמשתני הסביבה מוגדרים נכון
- בנה מחדש את הפרויקט אחרי הוספת משתני הסביבה

## אוטומציה עם GitHub Actions (אופציונלי)

ניתן להגדיר GitHub Actions שיבנה ויעלה אוטומטית בכל push:

1. צור תיקייה `.github/workflows/` בפרויקט
2. צור קובץ `deploy.yml` עם הגדרות FTP deployment
3. הגדר secrets ב-GitHub עבור פרטי ההתחברות לשרת

## עדכונים עתידיים

בכל פעם שאתה עושה שינויים:
1. עשה commit ו-push ל-GitHub
2. הרץ `npm run build` מקומית
3. העלה את תוכן `dist` החדש לשרת (שכתוב על הקבצים הקודמים)
