import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WearableData {
  id: string;
  user_id: string;
  date: string;
  steps?: number | null;
  heart_rate?: number | null;
  sleep_hours?: number | null;
  calories?: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export const useWearables = () => {
  const { user } = useAuth();
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [loading, setLoading] = useState(false);

  // Placeholder para integração futura
  // Apple Health e Google Fit requerem apps nativos ou SDKs específicos
  const connectAppleHealth = () => {
    toast.info("Integração com Apple Health em desenvolvimento");
    // Futura implementação: HealthKit integration
  };

  const connectGoogleFit = () => {
    toast.info("Integração com Google Fit em desenvolvimento");
    // Futura implementação: Google Fit API
  };

  const addManualData = async (data: Partial<WearableData>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('wearable_data').insert({
        user_id: user.id,
        date: data.date || new Date().toISOString().split('T')[0],
        steps: data.steps,
        heart_rate: data.heart_rate,
        sleep_hours: data.sleep_hours,
        calories: data.calories,
        source: 'manual'
      });

      if (error) throw error;
      toast.success("Dados adicionados com sucesso!");
      fetchWearableData();
    } catch (error) {
      console.error("Error adding wearable data:", error);
      toast.error("Erro ao adicionar dados");
    }
  };

  const fetchWearableData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wearable_data')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setWearableData(data || []);
    } catch (error) {
      console.error("Error fetching wearable data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWearableData();
    }
  }, [user]);

  return {
    wearableData,
    loading,
    connectAppleHealth,
    connectGoogleFit,
    addManualData,
    fetchWearableData
  };
};
