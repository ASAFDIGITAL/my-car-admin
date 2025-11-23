import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const wpUrl = Deno.env.get('WORDPRESS_SITE_URL');
    const wpUsername = Deno.env.get('WORDPRESS_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_APP_PASSWORD');

    if (!wpUrl || !wpUsername || !wpPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WordPress credentials not configured',
          tests: {
            credentials: { success: false, message: 'חסרות הגדרות חיבור ל-WordPress' }
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = `Basic ${btoa(`${wpUsername}:${wpPassword}`)}`;
    const tests: any = {
      credentials: { success: true, message: 'הגדרות חיבור קיימות' },
      connection: { success: false, message: '' },
      readPermission: { success: false, message: '' },
      writePermission: { success: false, message: '' },
    };

    // Test 1: Basic connection
    console.log('Testing basic connection...');
    try {
      const basicRes = await fetch(`${wpUrl}/wp-json/wp/v2/types`, {
        headers: { Authorization: authHeader },
      });
      
      if (basicRes.ok) {
        tests.connection = { 
          success: true, 
          message: 'חיבור ל-WordPress תקין ✓' 
        };
      } else {
        const errorText = await basicRes.text();
        tests.connection = { 
          success: false, 
          message: `שגיאה בחיבור: ${basicRes.status} - ${errorText}` 
        };
        // If basic connection fails, don't test further
        return new Response(
          JSON.stringify({ success: false, tests }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (error) {
      tests.connection = { 
        success: false, 
        message: `שגיאת חיבור: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
      return new Response(
        JSON.stringify({ success: false, tests }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test 2: Read permission for 'cars' post type
    console.log('Testing read permission...');
    try {
      const readRes = await fetch(`${wpUrl}/wp-json/wp/v2/cars?per_page=1`, {
        headers: { Authorization: authHeader },
      });
      
      if (readRes.ok) {
        tests.readPermission = { 
          success: true, 
          message: 'הרשאות קריאה לפוסטים מסוג cars תקינות ✓' 
        };
      } else if (readRes.status === 401) {
        tests.readPermission = { 
          success: false, 
          message: 'אין הרשאות קריאה לפוסטים מסוג cars (401)' 
        };
      } else if (readRes.status === 404) {
        tests.readPermission = { 
          success: false, 
          message: 'פוסט מסוג cars לא קיים או לא חשוף ב-REST API (404)' 
        };
      } else {
        const errorText = await readRes.text();
        tests.readPermission = { 
          success: false, 
          message: `שגיאה בקריאה (${readRes.status}): ${errorText}` 
        };
      }
    } catch (error) {
      tests.readPermission = { 
        success: false, 
        message: `שגיאה בקריאה: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }

    // Test 3: Write permission for 'cars' post type
    console.log('Testing write permission...');
    try {
      const testPostData = {
        title: '[TEST] Connection Test - Delete Me',
        status: 'draft', // Create as draft to avoid cluttering the site
      };

      const writeRes = await fetch(`${wpUrl}/wp-json/wp/v2/cars`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPostData),
      });

      if (writeRes.ok) {
        const createdPost = await writeRes.json();
        tests.writePermission = { 
          success: true, 
          message: 'הרשאות יצירת פוסטים מסוג cars תקינות ✓' 
        };

        // Clean up: delete the test post
        try {
          await fetch(`${wpUrl}/wp-json/wp/v2/cars/${createdPost.id}?force=true`, {
            method: 'DELETE',
            headers: { Authorization: authHeader },
          });
          console.log('Test post cleaned up');
        } catch (cleanupError) {
          console.error('Failed to cleanup test post:', cleanupError);
        }
      } else if (writeRes.status === 401) {
        const errorData = await writeRes.json();
        tests.writePermission = { 
          success: false, 
          message: `אין הרשאות ליצירת פוסטים מסוג cars (401): ${errorData.message || 'אין הרשאות'}`,
          details: errorData
        };
      } else if (writeRes.status === 403) {
        const errorData = await writeRes.json();
        tests.writePermission = { 
          success: false, 
          message: `אין הרשאות ליצירת פוסטים מסוג cars (403): ${errorData.message || 'אין הרשאות'}`,
          details: errorData
        };
      } else {
        const errorText = await writeRes.text();
        tests.writePermission = { 
          success: false, 
          message: `שגיאה ביצירת פוסט (${writeRes.status}): ${errorText}` 
        };
      }
    } catch (error) {
      tests.writePermission = { 
        success: false, 
        message: `שגיאה ביצירת פוסט: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }

    // Overall success is true only if all tests pass
    const overallSuccess = 
      tests.credentials.success && 
      tests.connection.success && 
      tests.readPermission.success && 
      tests.writePermission.success;

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        tests,
        summary: overallSuccess 
          ? 'כל הבדיקות עברו בהצלחה! ✓' 
          : 'נמצאו בעיות בחיבור ל-WordPress. אנא בדוק את הפרטים למעלה.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wordpress-test-connection function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        tests: {
          credentials: { success: false, message: 'שגיאה כללית במערכת' }
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
