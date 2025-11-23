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
  meta?: {
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
    console.log('WordPress URL:', wpUrl);

    // Fetch taxonomies with error handling
    console.log('Fetching companies...');
    const companiesRes = await fetch(`${wpUrl}/wp-json/wp/v2/company?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    
    if (!companiesRes.ok) {
      const errorText = await companiesRes.text();
      console.error('Failed to fetch companies:', errorText);
      throw new Error(`Failed to fetch companies: ${companiesRes.status}`);
    }
    
    const companiesData = await companiesRes.json();
    const companies: WordPressTaxonomy[] = Array.isArray(companiesData) ? companiesData : [];
    console.log(`Fetched ${companies.length} companies`);

    console.log('Fetching car types...');
    const typesRes = await fetch(`${wpUrl}/wp-json/wp/v2/typecar?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    
    if (!typesRes.ok) {
      const errorText = await typesRes.text();
      console.error('Failed to fetch types:', errorText);
      throw new Error(`Failed to fetch types: ${typesRes.status}`);
    }
    
    const typesData = await typesRes.json();
    const types: WordPressTaxonomy[] = Array.isArray(typesData) ? typesData : [];
    console.log(`Fetched ${types.length} car types`);

    console.log('Fetching car years...');
    const yearsRes = await fetch(`${wpUrl}/wp-json/wp/v2/yearcar?per_page=100`, {
      headers: { Authorization: authHeader },
    });
    
    if (!yearsRes.ok) {
      const errorText = await yearsRes.text();
      console.error('Failed to fetch years:', errorText);
      throw new Error(`Failed to fetch years: ${yearsRes.status}`);
    }
    
    const yearsData = await yearsRes.json();
    const years: WordPressTaxonomy[] = Array.isArray(yearsData) ? yearsData : [];
    console.log(`Fetched ${years.length} car years`);

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

    // Fetch cars with meta fields (Crocoblock) and featured image
    console.log('Fetching cars...');
    const carsRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/cars?per_page=100&_fields=id,title,status,company,typecar,yearcar,meta,featured_media,link`,
      {
        headers: { Authorization: authHeader },
      }
    );
    
    if (!carsRes.ok) {
      const errorText = await carsRes.text();
      console.error('WordPress API error:', errorText);
      throw new Error(`WordPress API returned ${carsRes.status}: ${errorText}`);
    }

    const carsData = await carsRes.json();
    
    // Check if response is an array
    if (!Array.isArray(carsData)) {
      console.error('WordPress API returned non-array:', carsData);
      throw new Error(`WordPress API returned invalid data: ${JSON.stringify(carsData)}`);
    }
    
    const cars: WordPressCar[] = carsData;

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

        // Map WordPress status to our enum (fallback ל-available אם לא קיים)
        let status: 'available' | 'sold' | 'reserved' | 'maintenance' = 'available';
        if (car.status === 'sold') status = 'sold';
        else if (car.status === 'reserved') status = 'reserved';
        else if (car.status === 'maintenance') status = 'maintenance';

        // Log meta fields to debug Crocoblock data
        console.log(`Car ${car.id} meta fields:`, JSON.stringify(car.meta));
        
        // Extract custom fields from meta (Crocoblock stores them in meta)
        const metaFields = car.meta || {};
        const customFields = {
          hand: metaFields.hand || '',
          km: metaFields.km || '',
          field_56806: metaFields.field_56806 || '',
          horsepower: metaFields.horsepower || '',
          engine_type: metaFields.engine_type || '',
          testcar: metaFields.testcar || '',
          price: metaFields.price || '',
          memon: metaFields.memon || '',
          seats: metaFields.seats || '',
          road_trip_date: metaFields.road_trip_date || '',
          number_car: metaFields.number_car || '',
        };
        
        console.log(`Car ${car.id} number_car:`, customFields.number_car);
        
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
              purchase_price: metaFields.purchase_price ? parseFloat(metaFields.purchase_price) : null,
              internal_notes: metaFields.internal_notes || null,
              custom_fields: customFields,
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
              // Check if image already exists for this car
              const { data: existingImage } = await supabaseClient
                .from('car_images')
                .select('id, storage_path')
                .eq('car_id', carData.id)
                .eq('is_primary', true)
                .single();

              // If image exists and URL hasn't changed, skip download
              if (existingImage && existingImage.storage_path.includes(`${car.id}_`)) {
                console.log(`Image already synced for car ${car.id}`);
              } else {
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
                  // Set all existing images as not primary
                  await supabaseClient
                    .from('car_images')
                    .update({ is_primary: false })
                    .eq('car_id', carData.id);

                  // Add new primary image to car_images table
                  await supabaseClient
                    .from('car_images')
                    .insert({
                      car_id: carData.id,
                      storage_path: filePath,
                      file_name: fileName,
                      file_size: arrayBuffer.byteLength,
                      is_primary: true,
                    });

                  console.log(`Successfully synced image for car ${car.id}`);
                } else {
                  console.error(`Upload error for car ${car.id}:`, uploadError);
                }
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
