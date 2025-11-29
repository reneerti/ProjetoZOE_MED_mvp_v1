/**
 * Serviço de Processamento de Bioimpedância
 * 
 * Fluxo: Upload → OCR → Estruturar → Matching → Banco → Detecção → Cache
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ message: "Bioimpedance processing function ready" }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
