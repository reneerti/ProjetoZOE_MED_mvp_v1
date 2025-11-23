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

      // Try to get from cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedCache: CachedExamData = JSON.parse(cached);
          const now = Date.now();
          
          // Check if cache is still valid
          if (now - parsedCache.timestamp < CACHE_DURATION) {
            // Check if there are new exams since cache
            const { data: newExams } = await supabase
              .from('exam_images')
              .select('id, created_at')
              .eq('user_id', userId)
              .gt('created_at', new Date(parsedCache.timestamp).toISOString())
              .limit(1);

            if (!newExams || newExams.length === 0) {
              // No new exams, use cache
              setCachedData(parsedCache.data);
              setLastUpdate(new Date(parsedCache.timestamp));
              setLoading(false);
              return;
            }
          }
        }
      }

      // Fetch fresh data from Supabase
      const { data: healthAnalysis } = await supabase
        .from('health_analysis')
        .select('analysis_summary')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: latestExam } = await supabase
        .from('exam_images')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newData = healthAnalysis?.analysis_summary || null;
      const now = Date.now();

      // Save to cache
      const cacheData: CachedExamData = {
        data: newData,
        timestamp: now,
        lastExamId: latestExam?.id || ''
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCachedData(newData);
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
