import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  deletedRecords: number;
  deletedFiles: number;
  freedSpace: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of old uploads...');

    // Get uploads older than 90 days with status 'completed' or 'error'
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: oldUploads, error: fetchError } = await supabase
      .from('bioimpedance_uploads')
      .select('id, image_url, status, measurement_id, created_at')
      .lt('created_at', ninetyDaysAgo.toISOString())
      .in('status', ['completed', 'error']);

    if (fetchError) {
      throw new Error(`Failed to fetch old uploads: ${fetchError.message}`);
    }

    console.log(`Found ${oldUploads?.length || 0} uploads to process`);

    const result: CleanupResult = {
      deletedRecords: 0,
      deletedFiles: 0,
      freedSpace: 0,
      errors: []
    };

    if (!oldUploads || oldUploads.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No old uploads to clean up',
          result 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Process each upload
    for (const upload of oldUploads) {
      try {
        // Only delete if there's a measurement record (data was processed)
        // OR if it's an error status (failed processing)
        const shouldDelete = upload.measurement_id !== null || upload.status === 'error';

        if (shouldDelete) {
          // Extract file path from URL
          const urlParts = upload.image_url.split('/');
          const bucketPath = urlParts.slice(urlParts.indexOf('bioimpedance-scans') + 1).join('/');

          // Delete file from storage
          const { error: deleteFileError } = await supabase
            .storage
            .from('bioimpedance-scans')
            .remove([bucketPath]);

          if (deleteFileError) {
            console.error(`Failed to delete file ${bucketPath}:`, deleteFileError);
            result.errors.push(`File ${bucketPath}: ${deleteFileError.message}`);
          } else {
            result.deletedFiles++;
            // Estimate freed space (assuming average of 1.5MB per image after compression)
            result.freedSpace += 1.5 * 1024 * 1024;
          }

          // Delete database record
          const { error: deleteRecordError } = await supabase
            .from('bioimpedance_uploads')
            .delete()
            .eq('id', upload.id);

          if (deleteRecordError) {
            console.error(`Failed to delete record ${upload.id}:`, deleteRecordError);
            result.errors.push(`Record ${upload.id}: ${deleteRecordError.message}`);
          } else {
            result.deletedRecords++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing upload ${upload.id}:`, errorMessage);
        result.errors.push(`Upload ${upload.id}: ${errorMessage}`);
      }
    }

    console.log('Cleanup completed:', result);

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed successfully',
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
