import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sample data based on the HTML example (Monjaro journey)
    const sampleData = [
      {
        measurement_date: '2024-10-01',
        weight: 110.4,
        body_fat_percentage: 35.0,
        muscle_mass: 67.1,
        water_percentage: 48.5,
        notes: JSON.stringify({ 
          bmi: 36.9, 
          visceral_fat: 16, 
          muscle_percentage: 60.7,
          observation: 'Baseline - Início da jornada'
        })
      },
      {
        measurement_date: '2024-10-08',
        weight: 108.6,
        body_fat_percentage: 34.8,
        muscle_mass: 66.0,
        water_percentage: 49.1,
        notes: JSON.stringify({ 
          bmi: 36.3, 
          visceral_fat: 16, 
          muscle_percentage: 60.8,
          observation: 'Fase de adaptação - Perda moderada'
        })
      },
      {
        measurement_date: '2024-10-15',
        weight: 106.8,
        body_fat_percentage: 34.7,
        muscle_mass: 65.2,
        water_percentage: 49.4,
        notes: JSON.stringify({ 
          bmi: 35.7, 
          visceral_fat: 16, 
          muscle_percentage: 61.0,
          observation: 'Primeira escalada - Mantém perda'
        })
      },
      {
        measurement_date: '2024-10-22',
        weight: 105.9,
        body_fat_percentage: 34.5,
        muscle_mass: 64.9,
        water_percentage: 49.6,
        notes: JSON.stringify({ 
          bmi: 35.4, 
          visceral_fat: 15, 
          muscle_percentage: 61.3,
          observation: 'Progresso constante'
        })
      },
      {
        measurement_date: '2024-10-29',
        weight: 104.2,
        body_fat_percentage: 33.8,
        muscle_mass: 64.5,
        water_percentage: 50.1,
        notes: JSON.stringify({ 
          bmi: 34.8, 
          visceral_fat: 15, 
          muscle_percentage: 61.9,
          observation: 'Grande salto - Perda acelerada'
        })
      },
      {
        measurement_date: '2024-11-05',
        weight: 102.8,
        body_fat_percentage: 33.2,
        muscle_mass: 64.1,
        water_percentage: 50.5,
        notes: JSON.stringify({ 
          bmi: 34.4, 
          visceral_fat: 15, 
          muscle_percentage: 62.3,
          observation: 'Mantém ritmo forte'
        })
      },
      {
        measurement_date: '2024-11-12',
        weight: 101.5,
        body_fat_percentage: 32.6,
        muscle_mass: 63.9,
        water_percentage: 51.0,
        notes: JSON.stringify({ 
          bmi: 33.9, 
          visceral_fat: 14, 
          muscle_percentage: 63.0,
          observation: 'Excelente evolução'
        })
      },
      {
        measurement_date: '2024-11-18',
        weight: 100.6,
        body_fat_percentage: 31.9,
        muscle_mass: 63.9,
        water_percentage: 51.5,
        notes: JSON.stringify({ 
          bmi: 33.6, 
          visceral_fat: 14, 
          muscle_percentage: 63.5,
          observation: 'Melhor resultado até agora - Gordura visceral em queda'
        })
      }
    ];

    // Insert all measurements
    const measurements = sampleData.map(data => ({
      ...data,
      user_id: user.id,
      created_at: new Date().toISOString()
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('bioimpedance_measurements')
      .insert(measurements)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedData.length} measurements for user ${user.id}`);

    // Generate summary analysis
    const firstMeasurement = sampleData[0];
    const lastMeasurement = sampleData[sampleData.length - 1];
    
    const summary = {
      total_measurements: sampleData.length,
      period: '11 semanas',
      weight_change: (lastMeasurement.weight - firstMeasurement.weight).toFixed(1),
      body_fat_change: (lastMeasurement.body_fat_percentage! - firstMeasurement.body_fat_percentage!).toFixed(1),
      muscle_mass_change: (lastMeasurement.muscle_mass! - firstMeasurement.muscle_mass!).toFixed(1),
      initial: {
        weight: firstMeasurement.weight,
        body_fat: firstMeasurement.body_fat_percentage,
        muscle_mass: firstMeasurement.muscle_mass
      },
      current: {
        weight: lastMeasurement.weight,
        body_fat: lastMeasurement.body_fat_percentage,
        muscle_mass: lastMeasurement.muscle_mass
      }
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados de exemplo adicionados com sucesso!',
        summary,
        measurements: insertedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in seed-bioimpedance-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
