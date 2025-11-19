import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { validateAndSanitize } from '../_shared/promptSanitizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ 
          error: 'Email inválido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const sanitizedEmail = email.trim().toLowerCase();

    // Server-side password validation using database function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_password_strength', { password_text: password });

    if (validationError) {
      console.error('Password validation error:', validationError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar senha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validationResult && validationResult.length > 0) {
      const result = validationResult[0];
      if (!result.valid) {
        return new Response(
          JSON.stringify({ 
            error: 'Senha não atende aos requisitos de segurança',
            details: result.errors 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Password is valid, proceed with signup
    const redirectUrl = `${req.headers.get('origin') || supabaseUrl}/`;
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: sanitizedEmail,
      password: password,
      email_confirm: true, // Auto-confirm for non-production
    });

    if (error) {
      // Handle specific Supabase auth errors
      if (error.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Signup error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: data.user,
        message: 'Conta criada com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup function error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar cadastro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
