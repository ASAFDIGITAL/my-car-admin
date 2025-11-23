import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carId } = await req.json();

    if (!carId) {
      throw new Error('Car ID is required');
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

    console.log('Fetching car from Supabase:', carId);

    // Fetch car with related data
    const { data: car, error: carError } = await supabaseClient
      .from('cars')
      .select(`
        *,
        companies(id, name, slug),
        car_types(id, name, slug),
        car_years(id, year)
      `)
      .eq('id', carId)
      .single();

    if (carError || !car) {
      throw new Error(`Failed to fetch car: ${carError?.message}`);
    }

    console.log('Car fetched:', car.title);

    // Map Supabase status to WordPress status taxonomy
    const statusMap: { [key: string]: string } = {
      'available': 'available',
      'sold': 'sold',
      'reserved': 'reserved',
      'maintenance': 'maintenance'
    };

    // Get WordPress taxonomy IDs
    let companyTermId = null;
    let typeTermId = null;
    let yearTermId = null;
    let statusTermId = null;

    if (car.companies) {
      const companyRes = await fetch(`${wpUrl}/wp-json/wp/v2/company?slug=${car.companies.slug}`, {
        headers: { Authorization: authHeader },
      });
      const companies = await companyRes.json();
      if (Array.isArray(companies) && companies[0]) {
        companyTermId = companies[0].id;
      }
    }

    if (car.car_types) {
      const typeRes = await fetch(`${wpUrl}/wp-json/wp/v2/typecar?slug=${car.car_types.slug}`, {
        headers: { Authorization: authHeader },
      });
      const types = await typeRes.json();
      if (Array.isArray(types) && types[0]) {
        typeTermId = types[0].id;
      }
    }

    if (car.car_years) {
      const yearRes = await fetch(`${wpUrl}/wp-json/wp/v2/yearcar?search=${car.car_years.year}`, {
        headers: { Authorization: authHeader },
      });
      const years = await yearRes.json();
      if (Array.isArray(years) && years[0]) {
        yearTermId = years[0].id;
      }
    }

    // Get status term ID
    const mappedStatus = statusMap[car.status] || 'available';
    const statusRes = await fetch(`${wpUrl}/wp-json/wp/v2/status?slug=${mappedStatus}`, {
      headers: { Authorization: authHeader },
    });
    const statuses = await statusRes.json();
    if (Array.isArray(statuses) && statuses[0]) {
      statusTermId = statuses[0].id;
    }

    // Prepare WordPress post data
    const customFields = car.custom_fields as any || {};
    const wpPostData = {
      title: car.title,
      status: 'publish',
      company: companyTermId ? [companyTermId] : [],
      typecar: typeTermId ? [typeTermId] : [],
      yearcar: yearTermId ? [yearTermId] : [],
      ...(statusTermId ? { status_taxonomy: [statusTermId] } : {}),
      acf: {
        purchase_price: car.purchase_price?.toString() || '',
        internal_notes: car.internal_notes || '',
        hand: customFields.hand || '',
        km: customFields.km || '',
        field_56806: customFields.field_56806 || '',
        horsepower: customFields.horsepower || '',
        engine_type: customFields.engine_type || '',
        testcar: customFields.testcar || '',
        price: customFields.price || '',
        memon: customFields.memon || '',
        seats: customFields.seats || '',
        road_trip_date: customFields.road_trip_date || '',
        number_car: customFields.number_car || '',
      },
    };

    let wpPostId = car.wordpress_id;
    let wpPost;

    // Create or update WordPress post
    if (wpPostId) {
      console.log('Updating existing WordPress post:', wpPostId);
      const updateRes = await fetch(`${wpUrl}/wp-json/wp/v2/cars/${wpPostId}`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpPostData),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error('Failed to update WordPress post:', errorText);
        throw new Error(`Failed to update WordPress post: ${updateRes.status}`);
      }

      wpPost = await updateRes.json();
    } else {
      console.log('Creating new WordPress post');
      const createRes = await fetch(`${wpUrl}/wp-json/wp/v2/cars`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpPostData),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error('Failed to create WordPress post:', errorText);
        throw new Error(`Failed to create WordPress post: ${createRes.status}`);
      }

      wpPost = await createRes.json();
      wpPostId = wpPost.id;

      // Update Supabase with WordPress ID
      await supabaseClient
        .from('cars')
        .update({ wordpress_id: wpPostId })
        .eq('id', carId);
    }

    // Upload images to WordPress
    const { data: images } = await supabaseClient
      .from('car_images')
      .select('*')
      .eq('car_id', carId)
      .order('is_primary', { ascending: false });

    if (images && images.length > 0) {
      console.log(`Uploading ${images.length} images to WordPress`);

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          // Download image from Supabase storage
          const { data: imageData } = await supabaseClient.storage
            .from('car-images')
            .download(image.storage_path);

          if (imageData) {
            const arrayBuffer = await imageData.arrayBuffer();

            // Create form data for WordPress
            const formData = new FormData();
            const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
            formData.append('file', blob, image.file_name);

            // Upload to WordPress media library
            const mediaRes = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
              method: 'POST',
              headers: {
                Authorization: authHeader,
              },
              body: formData,
            });

            if (mediaRes.ok) {
              const media = await mediaRes.json();
              console.log(`Uploaded image ${i + 1}:`, media.id);

              // Set as featured image if primary
              if (image.is_primary && wpPostId) {
                await fetch(`${wpUrl}/wp-json/wp/v2/cars/${wpPostId}`, {
                  method: 'POST',
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ featured_media: media.id }),
                });
                console.log('Set as featured image');
              }
            }
          }
        } catch (imgError) {
          console.error(`Error uploading image ${image.file_name}:`, imgError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced car to WordPress`,
        wordpressId: wpPostId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wordpress-push function:', error);
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
