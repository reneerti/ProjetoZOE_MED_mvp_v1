import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedExamData {
  data: any;
  timestamp: number;
  lastExamId: string;
}

const CACHE_KEY = 'exam_results_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useExamCache = (userId: string | undefined) => {
  const [cachedData, setCachedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load from cache or fetch fresh data
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // DADOS FICTÍCIOS para demonstração - sempre retorna dados de problemas hepáticos
      const fictitiousData = {
        pre_diagnostics: [
          {
            name: "🔴 Esteatose Hepática (Fígado Gorduroso)",
            severity: "high",
            explanation: "Os níveis elevados de TGO/AST (89 U/L) e TGP/ALT (125 U/L) indicam comprometimento da função hepática. A relação AST/ALT < 1 sugere esteatose hepática (fígado gorduroso). Este quadro requer avaliação médica urgente.",
            related_parameters: [
              { name: "TGO/AST", value: "89", unit: "U/L" },
              { name: "TGP/ALT", value: "125", unit: "U/L" },
              { name: "GGT", value: "78", unit: "U/L" }
            ],
            recommendations: [
              "🏥 URGENTE: Consultar hepatologista ou gastroenterologista",
              "🔬 Realizar ultrassonografia abdominal",
              "📊 Avaliar função hepática completa",
              "🥗 Iniciar dieta com restrição de gorduras",
              "🚫 Evitar consumo de álcool",
              "💊 Não automedicar - aguardar avaliação médica"
            ]
          },
          {
            name: "🔴 Processo Inflamatório Sistêmico Ativo",
            severity: "high",
            explanation: "PCR elevada (18.5 mg/L) indica processo inflamatório agudo intenso. VHS em 35 mm/h e ferritina em 520 ng/mL confirmam estado inflamatório sistêmico. Necessário investigação imediata da causa.",
            related_parameters: [
              { name: "PCR", value: "18.5", unit: "mg/L" },
              { name: "VHS", value: "35", unit: "mm/h" },
              { name: "Ferritina", value: "520", unit: "ng/mL" }
            ],
            recommendations: [
              "🏥 URGENTE: Consultar clínico geral ou imunologista",
              "🔬 Investigar foco infeccioso ou inflamatório",
              "📊 Solicitar hemograma completo e culturas",
              "🌡️ Monitorar sintomas (febre, dor, mal-estar)",
              "💊 Não usar anti-inflamatórios sem prescrição médica"
            ]
          },
          {
            name: "⚠️ Síndrome Metabólica - Risco Aumentado",
            severity: "medium",
            explanation: "A combinação de esteatose hepática com marcadores inflamatórios elevados sugere possível síndrome metabólica. Requer acompanhamento multidisciplinar.",
            related_parameters: [],
            recommendations: [
              "📏 Verificar peso, IMC e circunferência abdominal",
              "🩸 Solicitar perfil lipídico e glicemia",
              "💓 Aferir pressão arterial regularmente",
              "🏃 Iniciar atividade física supervisionada",
              "🥗 Nutricionista para plano alimentar"
            ]
          }
        ],
        grouped_results: [
          {
            category_name: "Função Hepática",
            parameters: [
              {
                name: "TGO/AST",
                value: "89",
                unit: "U/L",
                reference_range: "até 40 U/L",
                status: "critico"
              },
              {
                name: "TGP/ALT",
                value: "125",
                unit: "U/L",
                reference_range: "até 41 U/L",
                status: "critico"
              },
              {
                name: "GGT",
                value: "78",
                unit: "U/L",
                reference_range: "até 73 U/L",
                status: "alto"
              },
              {
                name: "Fosfatase Alcalina",
                value: "156",
                unit: "U/L",
                reference_range: "40-150 U/L",
                status: "alto"
              }
            ]
          },
          {
            category_name: "Marcadores Inflamatórios",
            parameters: [
              {
                name: "PCR (Proteína C Reativa)",
                value: "18.5",
                unit: "mg/L",
                reference_range: "< 5 mg/L",
                status: "critico"
              },
              {
                name: "VHS",
                value: "35",
                unit: "mm/h",
                reference_range: "< 20 mm/h",
                status: "alto"
              },
              {
                name: "Ferritina",
                value: "520",
                unit: "ng/mL",
                reference_range: "30-400 ng/mL",
                status: "alto"
              }
            ]
          }
        ]
      };

      const now = Date.now();

      // Save to cache
      const cacheData: CachedExamData = {
        data: fictitiousData,
        timestamp: now,
        lastExamId: 'fictitious-exam-id'
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCachedData(fictitiousData);
      setLastUpdate(new Date(now));
    } catch (error) {
      console.error('Error loading exam data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    loadData(true);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for storage events (cache updates from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        const parsedCache: CachedExamData = JSON.parse(e.newValue);
        setCachedData(parsedCache.data);
        setLastUpdate(new Date(parsedCache.timestamp));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    data: cachedData,
    loading,
    lastUpdate,
    refresh: () => loadData(true),
    invalidateCache
  };
};
