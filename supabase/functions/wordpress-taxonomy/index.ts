import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxonomyRequest {
  action: 'create' | 'update' | 'delete';
  taxonomyType: 'company' | 'typecar' | 'yearcar';
  data?: {
    id?: string;
    name: string;
    slug?: string;
    year?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, taxonomyType, data }: TaxonomyRequest = await req.json();

    if (!action || !taxonomyType) {
      throw new Error('Action and taxonomy type are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const wpUrl = Deno.env.get('WORDPRESS_SITE_URL');
    const wpUsername = Deno.env.get('WORDPRESS_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_APP_PASSWORD');

    if (!wpUrl || !wpUsername || !wpPassword) {
      throw new Error('WordPress credentials not configured');
    }

    const authHeader = `Basic ${btoa(`${wpUsername}:${wpPassword}`)}`;

    console.log(`Processing ${action} for ${taxonomyType}`);

    if (action === 'create' && data) {
      // Create slug from name if not provided
      const slug = data.slug || data.name.toLowerCase()
        .replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Create in WordPress first
      const wpData: any = {
        name: data.name,
        slug: slug,
      };

      console.log('Creating in WordPress:', wpData);

      const createRes = await fetch(`${wpUrl}/wp-json/wp/v2/${taxonomyType}`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpData),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error('Failed to create in WordPress:', errorText);
        throw new Error(`Failed to create in WordPress: ${createRes.status}`);
      }

      const wpTerm = await createRes.json();
      console.log('Created in WordPress:', wpTerm.id);

      // Create in Supabase
      let supabaseData: any = { name: data.name, slug: slug };
      let table = '';

      if (taxonomyType === 'company') {
        table = 'companies';
      } else if (taxonomyType === 'typecar') {
        table = 'car_types';
      } else if (taxonomyType === 'yearcar') {
        table = 'car_years';
        if (data.year) {
          supabaseData = { year: data.year };
        } else {
          throw new Error('Year is required for yearcar taxonomy');
        }
      }

      const { data: created, error } = await supabaseClient
        .from(table)
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to create in Supabase: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully created ${taxonomyType}`,
          data: created,
          wordpressId: wpTerm.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'delete' && data?.id) {
      // Get the item from Supabase first
      let table = '';
      let slugField = 'slug';

      if (taxonomyType === 'company') {
        table = 'companies';
      } else if (taxonomyType === 'typecar') {
        table = 'car_types';
      } else if (taxonomyType === 'yearcar') {
        table = 'car_years';
        slugField = 'year';
      }

      const { data: item } = await supabaseClient
        .from(table)
        .select('*')
        .eq('id', data.id)
        .single();

      if (item) {
        // Find and delete in WordPress
        const searchValue = taxonomyType === 'yearcar' ? item.year : item.slug;
        const searchParam = taxonomyType === 'yearcar' ? 'search' : 'slug';
        
        const searchRes = await fetch(
          `${wpUrl}/wp-json/wp/v2/${taxonomyType}?${searchParam}=${searchValue}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (searchRes.ok) {
          const terms = await searchRes.json();
          if (Array.isArray(terms) && terms[0]) {
            await fetch(`${wpUrl}/wp-json/wp/v2/${taxonomyType}/${terms[0].id}?force=true`, {
              method: 'DELETE',
              headers: { Authorization: authHeader },
            });
            console.log('Deleted from WordPress:', terms[0].id);
          }
        }
      }

      // Delete from Supabase
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('id', data.id);

      if (error) {
        throw new Error(`Failed to delete from Supabase: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully deleted ${taxonomyType}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action or missing data');
  } catch (error) {
    console.error('Error in wordpress-taxonomy function:', error);
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