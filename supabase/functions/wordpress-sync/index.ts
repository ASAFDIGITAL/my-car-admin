import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WordPressCar {
  id: number;
  title: { rendered: string };
  status: string;
  company: number[];
  typecar: number[];
  yearcar: number[];
  acf?: {
    purchase_price?: string;
    internal_notes?: string;
    [key: string]: any;
  };
  featured_media: number;
}

interface WordPressTaxonomy {
  id: number;
  name: string;
  slug: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log('Starting WordPress sync...');

    // Fetch taxonomies
    console.log('Fetching companies...');
    const companiesRes = await fetch(`${wpUrl}/wp-json/wp/v2/company?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    const companies: WordPressTaxonomy[] = await companiesRes.json();

    console.log('Fetching car types...');
    const typesRes = await fetch(`${wpUrl}/wp-json/wp/v2/typecar?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    const types: WordPressTaxonomy[] = await typesRes.json();

    console.log('Fetching car years...');
    const yearsRes = await fetch(`${wpUrl}/wp-json/wp/v2/yearcar?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    const years: WordPressTaxonomy[] = await yearsRes.json();

    // Sync companies
    for (const company of companies) {
      await supabaseClient
        .from('companies')
        .upsert({ slug: company.slug, name: company.name }, { onConflict: 'slug' });
    }

    // Sync car types
    for (const type of types) {
      await supabaseClient
        .from('car_types')
        .upsert({ slug: type.slug, name: type.name }, { onConflict: 'slug' });
    }

    // Sync car years
    for (const year of years) {
      const yearNum = parseInt(year.name);
      if (!isNaN(yearNum)) {
        await supabaseClient
          .from('car_years')
          .upsert({ year: yearNum }, { onConflict: 'year' });
      }
    }

    // Fetch cars
    console.log('Fetching cars...');
    const carsRes = await fetch(`${wpUrl}/wp-json/wp/v2/car?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    const cars: WordPressCar[] = await carsRes.json();

    let syncedCount = 0;
    let errorCount = 0;

    for (const car of cars) {
      try {
        // Get taxonomy UUIDs
        let companyId = null;
        let carTypeId = null;
        let carYearId = null;

        if (car.company && car.company[0]) {
          const companySlug = companies.find(c => c.id === car.company[0])?.slug;
          if (companySlug) {
            const { data } = await supabaseClient
              .from('companies')
              .select('id')
              .eq('slug', companySlug)
              .single();
            companyId = data?.id;
          }
        }

        if (car.typecar && car.typecar[0]) {
          const typeSlug = types.find(t => t.id === car.typecar[0])?.slug;
          if (typeSlug) {
            const { data } = await supabaseClient
              .from('car_types')
              .select('id')
              .eq('slug', typeSlug)
              .single();
            carTypeId = data?.id;
          }
        }

        if (car.yearcar && car.yearcar[0]) {
          const yearName = years.find(y => y.id === car.yearcar[0])?.name;
          if (yearName) {
            const yearNum = parseInt(yearName);
            if (!isNaN(yearNum)) {
              const { data } = await supabaseClient
                .from('car_years')
                .select('id')
                .eq('year', yearNum)
                .single();
              carYearId = data?.id;
            }
          }
        }

        // Map WordPress status to our enum
        let status: 'available' | 'pending' | 'sold' | 'reserved' = 'available';
        if (car.status === 'sold') status = 'sold';
        else if (car.status === 'reserved') status = 'reserved';
        else if (car.status === 'pending') status = 'pending';

        // Upsert car
        const { data: carData, error: carError } = await supabaseClient
          .from('cars')
          .upsert(
            {
              wordpress_id: car.id,
              title: car.title.rendered,
              status,
              company_id: companyId,
              car_type_id: carTypeId,
              car_year_id: carYearId,
              purchase_price: car.acf?.purchase_price ? parseFloat(car.acf.purchase_price) : null,
              internal_notes: car.acf?.internal_notes || null,
              custom_fields: car.acf || {},
            },
            { onConflict: 'wordpress_id' }
          )
          .select()
          .single();

        if (carError) {
          console.error(`Error syncing car ${car.id}:`, carError);
          errorCount++;
          continue;
        }

        // Sync featured image if exists
        if (car.featured_media && carData) {
          try {
            const mediaRes = await fetch(`${wpUrl}/wp-json/wp/v2/media/${car.featured_media}`, {
              headers: { Authorization: authHeader },
            });
            const media = await mediaRes.json();

            if (media.source_url) {
              // Download image
              const imageRes = await fetch(media.source_url);
              const imageBlob = await imageRes.blob();
              const arrayBuffer = await imageBlob.arrayBuffer();

              // Upload to Supabase storage
              const fileName = `${car.id}_${Date.now()}.jpg`;
              const filePath = `${carData.id}/${fileName}`;

              const { error: uploadError } = await supabaseClient.storage
                .from('car-images')
                .upload(filePath, arrayBuffer, {
                  contentType: media.mime_type || 'image/jpeg',
                  upsert: true,
                });

              if (!uploadError) {
                // Add to car_images table
                await supabaseClient
                  .from('car_images')
                  .upsert(
                    {
                      car_id: carData.id,
                      storage_path: filePath,
                      file_name: fileName,
                      file_size: arrayBuffer.byteLength,
                      is_primary: true,
                    },
                    { onConflict: 'car_id,storage_path' }
                  );
              }
            }
          } catch (imgError) {
            console.error(`Error syncing image for car ${car.id}:`, imgError);
          }
        }

        syncedCount++;
      } catch (error) {
        console.error(`Error processing car ${car.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} cars from WordPress. ${errorCount} errors.`,
        synced: syncedCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wordpress-sync function:', error);
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
