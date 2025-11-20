export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_alert_history: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: number | null
          alert_type: string
          created_at: string
          function_name: string
          id: string
          message: string
          metadata: Json | null
          severity: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type: string
          created_at?: string
          function_name: string
          id?: string
          message: string
          metadata?: Json | null
          severity: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type?: string
          created_at?: string
          function_name?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: []
      }
      ai_autotuning_config: {
        Row: {
          auto_apply_low_risk: boolean
          auto_apply_medium_risk: boolean
          created_at: string
          enabled: boolean
          excluded_functions: string[] | null
          id: string
          max_daily_applications: number
          min_confidence_score: number
          require_admin_approval: boolean
          updated_at: string
        }
        Insert: {
          auto_apply_low_risk?: boolean
          auto_apply_medium_risk?: boolean
          created_at?: string
          enabled?: boolean
          excluded_functions?: string[] | null
          id?: string
          max_daily_applications?: number
          min_confidence_score?: number
          require_admin_approval?: boolean
          updated_at?: string
        }
        Update: {
          auto_apply_low_risk?: boolean
          auto_apply_medium_risk?: boolean
          created_at?: string
          enabled?: boolean
          excluded_functions?: string[] | null
          id?: string
          max_daily_applications?: number
          min_confidence_score?: number
          require_admin_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ai_autotuning_history: {
        Row: {
          applied_at: string
          applied_by: string | null
          auto_applied: boolean
          created_at: string
          id: string
          new_config: Json | null
          previous_config: Json | null
          recommendation_id: string
          result: string | null
          success: boolean | null
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          auto_applied?: boolean
          created_at?: string
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          recommendation_id: string
          result?: string | null
          success?: boolean | null
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          auto_applied?: boolean
          created_at?: string
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          recommendation_id?: string
          result?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_autotuning_history_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_optimization_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_budget_config: {
        Row: {
          alert_threshold_percentage: number
          budget_period_end: string
          budget_period_start: string
          created_at: string
          current_month_spending: number
          enable_budget_alerts: boolean
          id: string
          monthly_limit_usd: number
          updated_at: string
        }
        Insert: {
          alert_threshold_percentage?: number
          budget_period_end?: string
          budget_period_start?: string
          created_at?: string
          current_month_spending?: number
          enable_budget_alerts?: boolean
          id?: string
          monthly_limit_usd?: number
          updated_at?: string
        }
        Update: {
          alert_threshold_percentage?: number
          budget_period_end?: string
          budget_period_start?: string
          created_at?: string
          current_month_spending?: number
          enable_budget_alerts?: boolean
          id?: string
          monthly_limit_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_circuit_breaker_config: {
        Row: {
          alert_threshold_percentage: number
          cooldown_seconds: number
          created_at: string
          enable_notifications: boolean
          failure_threshold: number
          failure_window_minutes: number
          id: string
          updated_at: string
        }
        Insert: {
          alert_threshold_percentage?: number
          cooldown_seconds?: number
          created_at?: string
          enable_notifications?: boolean
          failure_threshold?: number
          failure_window_minutes?: number
          id?: string
          updated_at?: string
        }
        Update: {
          alert_threshold_percentage?: number
          cooldown_seconds?: number
          created_at?: string
          enable_notifications?: boolean
          failure_threshold?: number
          failure_window_minutes?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_circuit_breaker_state: {
        Row: {
          created_at: string
          failure_count: number
          function_name: string
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          opened_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          function_name: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          function_name?: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_function_thresholds: {
        Row: {
          created_at: string
          enable_alerts: boolean
          function_name: string
          id: string
          last_alert_sent_at: string | null
          max_cost_per_request: number | null
          max_failure_rate: number | null
          max_response_time_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_alerts?: boolean
          function_name: string
          id?: string
          last_alert_sent_at?: string | null
          max_cost_per_request?: number | null
          max_failure_rate?: number | null
          max_response_time_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_alerts?: boolean
          function_name?: string
          id?: string
          last_alert_sent_at?: string | null
          max_cost_per_request?: number | null
          max_failure_rate?: number | null
          max_response_time_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_optimization_recommendations: {
        Row: {
          applied_at: string | null
          created_at: string
          current_metric_value: number
          dismissed_at: string | null
          estimated_cost_savings: number | null
          estimated_performance_gain: number | null
          expected_improvement: string
          function_name: string
          id: string
          priority: string
          reasoning: string
          recommendation_type: string
          recommended_action: string
          status: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          current_metric_value: number
          dismissed_at?: string | null
          estimated_cost_savings?: number | null
          estimated_performance_gain?: number | null
          expected_improvement: string
          function_name: string
          id?: string
          priority: string
          reasoning: string
          recommendation_type: string
          recommended_action: string
          status?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          current_metric_value?: number
          dismissed_at?: string | null
          estimated_cost_savings?: number | null
          estimated_performance_gain?: number | null
          expected_improvement?: string
          function_name?: string
          id?: string
          priority?: string
          reasoning?: string
          recommendation_type?: string
          recommended_action?: string
          status?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          hit_count: number
          id: string
          last_accessed_at: string
          model: string | null
          prompt_hash: string
          provider: string
          response_data: Json
          tokens_used: number | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          function_name: string
          hit_count?: number
          id?: string
          last_accessed_at?: string
          model?: string | null
          prompt_hash: string
          provider: string
          response_data: Json
          tokens_used?: number | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          hit_count?: number
          id?: string
          last_accessed_at?: string
          model?: string | null
          prompt_hash?: string
          provider?: string
          response_data?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_trend_analysis: {
        Row: {
          analysis_date: string
          anomaly_severity: string | null
          confidence_score: number | null
          created_at: string
          current_value: number
          function_name: string | null
          id: string
          is_anomaly: boolean | null
          metadata: Json | null
          metric_type: string
          predicted_value: number | null
          trend_direction: string | null
        }
        Insert: {
          analysis_date?: string
          anomaly_severity?: string | null
          confidence_score?: number | null
          created_at?: string
          current_value: number
          function_name?: string | null
          id?: string
          is_anomaly?: boolean | null
          metadata?: Json | null
          metric_type: string
          predicted_value?: number | null
          trend_direction?: string | null
        }
        Update: {
          analysis_date?: string
          anomaly_severity?: string | null
          confidence_score?: number | null
          created_at?: string
          current_value?: number
          function_name?: string | null
          id?: string
          is_anomaly?: boolean | null
          metadata?: Json | null
          metric_type?: string
          predicted_value?: number | null
          trend_direction?: string | null
        }
        Relationships: []
      }
      ai_usage_alerts: {
        Row: {
          created_at: string
          daily_cost_threshold: number | null
          enable_cost_alerts: boolean
          enable_fallback_alerts: boolean
          fallback_threshold: number
          id: string
          last_alert_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_cost_threshold?: number | null
          enable_cost_alerts?: boolean
          enable_fallback_alerts?: boolean
          fallback_threshold?: number
          id?: string
          last_alert_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_cost_threshold?: number | null
          enable_cost_alerts?: boolean
          enable_fallback_alerts?: boolean
          fallback_threshold?: number
          id?: string
          last_alert_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          function_name: string
          id: string
          model: string | null
          provider: string
          response_time_ms: number | null
          success: boolean
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name: string
          id?: string
          model?: string | null
          provider: string
          response_time_ms?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name?: string
          id?: string
          model?: string | null
          provider?: string
          response_time_ms?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_webhook_config: {
        Row: {
          alert_types: string[]
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          alert_types?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          webhook_type: string
          webhook_url: string
        }
        Update: {
          alert_types?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
      }
      bioimpedance_measurements: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          id: string
          measurement_date: string
          muscle_mass: number | null
          notes: string | null
          user_id: string
          water_percentage: number | null
          weight: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          id?: string
          measurement_date: string
          muscle_mass?: number | null
          notes?: string | null
          user_id: string
          water_percentage?: number | null
          weight: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          id?: string
          measurement_date?: string
          muscle_mass?: number | null
          notes?: string | null
          user_id?: string
          water_percentage?: number | null
          weight?: number
        }
        Relationships: []
      }
      bioimpedance_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          image_url: string
          manual_corrections: Json | null
          measurement_id: string | null
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url: string
          manual_corrections?: Json | null
          measurement_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string
          manual_corrections?: Json | null
          measurement_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_composition_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          goal_type: string
          id: string
          notes: string | null
          start_date: string
          start_value: number
          status: string
          target_date: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          goal_type: string
          id?: string
          notes?: string | null
          start_date?: string
          start_value: number
          status?: string
          target_date: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          goal_type?: string
          id?: string
          notes?: string | null
          start_date?: string
          start_value?: number
          status?: string
          target_date?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cache_performance_daily: {
        Row: {
          cache_hit_rate: number
          created_at: string
          date: string
          id: string
          total_hits: number
          total_requests: number
        }
        Insert: {
          cache_hit_rate: number
          created_at?: string
          date: string
          id?: string
          total_hits: number
          total_requests: number
        }
        Update: {
          cache_hit_rate?: number
          created_at?: string
          date?: string
          id?: string
          total_hits?: number
          total_requests?: number
        }
        Relationships: []
      }
      controller_patients: {
        Row: {
          controller_id: string
          created_at: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          controller_id: string
          created_at?: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          controller_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_reports_history: {
        Row: {
          controller_id: string
          created_at: string | null
          email_id: string | null
          error_message: string | null
          id: string
          month: string
          recipient_email: string
          report_type: string
          sent_at: string | null
          status: string
          updated_at: string | null
          year: string
        }
        Insert: {
          controller_id: string
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          month: string
          recipient_email: string
          report_type?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          year: string
        }
        Update: {
          controller_id?: string
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          month?: string
          recipient_email?: string
          report_type?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          year?: string
        }
        Relationships: []
      }
      evolution_notes: {
        Row: {
          created_at: string | null
          health_score: number | null
          id: string
          note_date: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          note_date: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          note_date?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exam_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exam_images: {
        Row: {
          created_at: string | null
          exam_category_id: string | null
          exam_date: string | null
          exam_id: string | null
          exam_type_id: string | null
          file_type: string | null
          id: string
          image_url: string
          lab_name: string | null
          ocr_text: string | null
          processing_status: string | null
          reporting_doctor: string | null
          requesting_doctor: string | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_category_id?: string | null
          exam_date?: string | null
          exam_id?: string | null
          exam_type_id?: string | null
          file_type?: string | null
          id?: string
          image_url: string
          lab_name?: string | null
          ocr_text?: string | null
          processing_status?: string | null
          reporting_doctor?: string | null
          requesting_doctor?: string | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exam_category_id?: string | null
          exam_date?: string | null
          exam_id?: string | null
          exam_type_id?: string | null
          file_type?: string | null
          id?: string
          image_url?: string
          lab_name?: string | null
          ocr_text?: string | null
          processing_status?: string | null
          reporting_doctor?: string | null
          requesting_doctor?: string | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_images_exam_category_id_fkey"
            columns: ["exam_category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_images_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_images_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_parameters: {
        Row: {
          created_at: string | null
          critical_high: number | null
          critical_low: number | null
          description: string | null
          exam_type_id: string | null
          id: string
          parameter_name: string
          reference_max: number | null
          reference_min: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          description?: string | null
          exam_type_id?: string | null
          id?: string
          parameter_name: string
          reference_max?: number | null
          reference_min?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          description?: string | null
          exam_type_id?: string | null
          id?: string
          parameter_name?: string
          reference_max?: number | null
          reference_min?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_parameters_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string | null
          exam_image_id: string | null
          id: string
          parameter_id: string | null
          parameter_name: string
          status: string | null
          unit: string | null
          value: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string | null
          exam_image_id?: string | null
          id?: string
          parameter_id?: string | null
          parameter_name: string
          status?: string | null
          unit?: string | null
          value?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string | null
          exam_image_id?: string | null
          id?: string
          parameter_id?: string | null
          parameter_name?: string
          status?: string | null
          unit?: string | null
          value?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_image_id_fkey"
            columns: ["exam_image_id"]
            isOneToOne: false
            referencedRelation: "exam_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "exam_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category_id: string | null
          created_at: string | null
          exam_date: string
          exam_name: string
          id: string
          notes: string | null
          results: Json | null
          status: string
          type_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          exam_date: string
          exam_name: string
          id?: string
          notes?: string | null
          results?: Json | null
          status: string
          type_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          exam_date?: string
          exam_name?: string
          id?: string
          notes?: string | null
          results?: Json | null
          status?: string
          type_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_notifications: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          progress_percentage: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          progress_percentage?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          progress_percentage?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_notifications_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "body_composition_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_alerts: {
        Row: {
          created_at: string
          critical_threshold: number
          exam_image_id: string | null
          id: string
          parameter_name: string
          read_at: string | null
          severity: string
          status: string
          threshold_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          critical_threshold: number
          exam_image_id?: string | null
          id?: string
          parameter_name: string
          read_at?: string | null
          severity: string
          status?: string
          threshold_type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          critical_threshold?: number
          exam_image_id?: string | null
          id?: string
          parameter_name?: string
          read_at?: string | null
          severity?: string
          status?: string
          threshold_type?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_alerts_exam_image_id_fkey"
            columns: ["exam_image_id"]
            isOneToOne: false
            referencedRelation: "exam_images"
            referencedColumns: ["id"]
          },
        ]
      }
      health_analysis: {
        Row: {
          analysis_summary: Json | null
          attention_points: Json | null
          created_at: string | null
          health_score: number | null
          id: string
          specialist_recommendations: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_summary?: Json | null
          attention_points?: Json | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          specialist_recommendations?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_summary?: Json | null
          attention_points?: Json | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          specialist_recommendations?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          active: boolean | null
          created_at: string | null
          current_dose: string
          id: string
          medication_name: string
          notes: string | null
          schedule: Json | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          current_dose: string
          id?: string
          medication_name: string
          notes?: string | null
          schedule?: Json | null
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          current_dose?: string
          id?: string
          medication_name?: string
          notes?: string | null
          schedule?: Json | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_token_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          provider: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          provider: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          provider?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          id: string
          max_exams_per_month: number | null
          modules_enabled: Json
          name: string
          price_monthly: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_exams_per_month?: number | null
          modules_enabled?: Json
          name: string
          price_monthly?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_exams_per_month?: number | null
          modules_enabled?: Json
          name?: string
          price_monthly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      supplement_logs: {
        Row: {
          created_at: string
          dose_taken: string
          id: string
          notes: string | null
          supplement_id: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose_taken: string
          id?: string
          notes?: string | null
          supplement_id: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose_taken?: string
          id?: string
          notes?: string | null
          supplement_id?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_recommendations: {
        Row: {
          based_on_bioimpedance_id: string | null
          based_on_exam_id: string | null
          created_at: string
          id: string
          reasoning: string
          recommended_dose: string
          status: string
          supplement_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          based_on_bioimpedance_id?: string | null
          based_on_exam_id?: string | null
          created_at?: string
          id?: string
          reasoning: string
          recommended_dose: string
          status?: string
          supplement_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          based_on_bioimpedance_id?: string | null
          based_on_exam_id?: string | null
          created_at?: string
          id?: string
          reasoning?: string
          recommended_dose?: string
          status?: string
          supplement_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_recommendations_based_on_bioimpedance_id_fkey"
            columns: ["based_on_bioimpedance_id"]
            isOneToOne: false
            referencedRelation: "bioimpedance_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_recommendations_based_on_exam_id_fkey"
            columns: ["based_on_exam_id"]
            isOneToOne: false
            referencedRelation: "exam_images"
            referencedColumns: ["id"]
          },
        ]
      }
      supplements: {
        Row: {
          active: boolean | null
          created_at: string
          current_dose: string
          end_date: string | null
          frequency: string
          id: string
          notes: string | null
          start_date: string
          supplement_name: string
          supplement_type: string
          time_of_day: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          current_dose: string
          end_date?: string | null
          frequency: string
          id?: string
          notes?: string | null
          start_date: string
          supplement_name: string
          supplement_type: string
          time_of_day?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          current_dose?: string
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          start_date?: string
          supplement_name?: string
          supplement_type?: string
          time_of_day?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          exams_used_this_month: number
          id: string
          plan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_period_end: string
          current_period_start?: string
          exams_used_this_month?: number
          id?: string
          plan_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          exams_used_this_month?: number
          id?: string
          plan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_connections: {
        Row: {
          access_token: string | null
          connected_at: string
          created_at: string
          id: string
          last_sync_at: string | null
          last_token_rotation: string | null
          provider: string
          refresh_token: string | null
          rotation_count: number | null
          scopes: string[] | null
          sync_enabled: boolean
          token_expires_at: string | null
          tokens_encrypted: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_token_rotation?: string | null
          provider: string
          refresh_token?: string | null
          rotation_count?: number | null
          scopes?: string[] | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          tokens_encrypted?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_token_rotation?: string | null
          provider?: string
          refresh_token?: string | null
          rotation_count?: number | null
          scopes?: string[] | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          tokens_encrypted?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_data: {
        Row: {
          calories: number | null
          created_at: string
          date: string
          heart_rate: number | null
          id: string
          sleep_hours: number | null
          source: string
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string
          date: string
          heart_rate?: number | null
          id?: string
          sleep_hours?: number | null
          source: string
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string
          date?: string
          heart_rate?: number | null
          id?: string
          sleep_hours?: number | null
          source?: string
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_token_audit: {
        Row: {
          action: string
          connection_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          connection_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          connection_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_token_audit_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wearable_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_cost_trend: {
        Args: { _days?: number; _function_name?: string }
        Returns: {
          confidence_score: number
          current_daily_avg: number
          function_name: string
          predicted_daily_avg: number
          predicted_monthly_cost: number
          trend_direction: string
        }[]
      }
      check_ai_failure_alert: {
        Args: never
        Returns: {
          failure_rate: number
          function_name: string
          should_alert: boolean
          threshold_percentage: number
          total_failures: number
        }[]
      }
      check_cache_performance_alert: {
        Args: never
        Returns: {
          avg_hit_rate: number
          days_below_threshold: number
          should_alert: boolean
        }[]
      }
      check_function_thresholds: {
        Args: never
        Returns: {
          actual_value: number
          alert_type: string
          function_name: string
          severity: string
          should_alert: boolean
          threshold_value: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: Json
      }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      detect_cost_anomalies: {
        Args: { _days?: number; _threshold_std_dev?: number }
        Returns: {
          actual_cost: number
          date: string
          deviation_score: number
          expected_cost: number
          function_name: string
          is_anomaly: boolean
          std_dev: number
        }[]
      }
      generate_ai_optimization_recommendations: {
        Args: never
        Returns: {
          current_metric_value: number
          estimated_cost_savings: number
          estimated_performance_gain: number
          expected_improvement: string
          function_name: string
          priority: string
          reasoning: string
          recommendation_type: string
          recommended_action: string
        }[]
      }
      get_admin_stats: {
        Args: never
        Returns: {
          failed_uploads: number
          successful_uploads: number
          this_month_uploads: number
          total_measurements: number
          total_storage_mb: number
          total_uploads: number
          total_users: number
        }[]
      }
      get_ai_failure_rate: {
        Args: { _function_name?: string; _minutes?: number }
        Returns: {
          failed_requests: number
          failure_rate: number
          function_name: string
          last_failure_at: string
          total_requests: number
        }[]
      }
      get_ai_usage_stats: {
        Args: { _days?: number; _user_id: string }
        Returns: {
          avg_response_time_ms: number
          daily_stats: Json
          fallback_requests: number
          gemini_api_requests: number
          lovable_ai_requests: number
          success_rate: number
          total_cost_usd: number
          total_requests: number
        }[]
      }
      get_all_users_admin: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          last_upload: string
          total_uploads: number
          user_id: string
        }[]
      }
      get_budget_status: {
        Args: never
        Returns: {
          alert_threshold_reached: boolean
          current_spending: number
          days_elapsed: number
          days_in_month: number
          is_over_budget: boolean
          monthly_limit: number
          percentage_used: number
          projected_monthly_spending: number
          remaining_budget: number
        }[]
      }
      get_cache_stats: {
        Args: never
        Returns: {
          avg_cache_age_hours: number
          cache_hit_rate: number
          cache_size_mb: number
          estimated_cost_saved: number
          most_cached_functions: Json
          total_cache_hits: number
          total_cached_responses: number
          total_cached_tokens: number
        }[]
      }
      get_controller_patients: {
        Args: { _controller_id: string }
        Returns: {
          patient_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_stats: {
        Args: { _user_id: string }
        Returns: {
          failed_uploads: number
          storage_used_mb: number
          successful_uploads: number
          this_month_uploads: number
          total_measurements: number
          total_uploads: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_all_cache: { Args: never; Returns: number }
      invalidate_cache_by_function: {
        Args: { _function_name: string }
        Returns: number
      }
      is_patient_of_controller: {
        Args: { _controller_id: string; _patient_id: string }
        Returns: boolean
      }
      record_circuit_breaker_state: {
        Args: {
          _failure_count?: number
          _function_name: string
          _new_state: string
        }
        Returns: undefined
      }
      record_daily_cache_performance: { Args: never; Returns: undefined }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: {
          errors: string[]
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "controller"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "controller"],
    },
  },
} as const
