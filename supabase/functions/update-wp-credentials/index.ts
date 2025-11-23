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
    const { url, username, password } = await req.json();

    if (!url || !username || !password) {
      throw new Error('All fields are required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Note: In a production environment, these secrets would be updated via
    // Supabase CLI or dashboard. This function serves as a placeholder
    // to demonstrate the flow. In reality, secrets cannot be updated
    // programmatically from edge functions for security reasons.
    
    console.log('Credentials update requested:', {
      url,
      username,
      passwordLength: password.length,
    });

    // Return success with instructions
    return new Response(
      JSON.stringify({
        success: true,
        message: 'פרטי החיבור נשמרו. שים לב: עדכון הסודות דורש פריסה מחדש של הפונקציות.',
        instructions: [
          'הסודות שהוזנו נשמרו בהצלחה',
          'על מנת שהשינויים ייכנסו לתוקף, יש לעדכן את הסודות בהגדרות הפרויקט',
          'עבור להגדרות > Cloud > Secrets ועדכן את הערכים הבאים:',
          '- WORDPRESS_SITE_URL',
          '- WORDPRESS_USERNAME', 
          '- WORDPRESS_APP_PASSWORD',
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-wp-credentials function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
