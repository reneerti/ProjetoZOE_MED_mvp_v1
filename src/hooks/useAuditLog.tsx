import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
}

export const useAuditLog = () => {
  const logAction = async ({
    action,
    entityType,
    entityId,
    oldValues,
    newValues
  }: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get client IP and user agent (best effort)
      const userAgent = navigator.userAgent;

      await supabase.from('admin_audit_logs').insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        user_agent: userAgent
      });
    } catch (error) {
      console.error("Error logging audit action:", error);
      // Don't throw - audit logging should not block operations
    }
  };

  return { logAction };
};
