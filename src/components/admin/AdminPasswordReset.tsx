import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key } from "lucide-react";

export const AdminPasswordReset = () => {
  const [email, setEmail] = useState("reneerti@gmail.com");
  const [password, setPassword] = useState("123");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email, password }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Senha alterada com sucesso para ${email}`);
      } else {
        throw new Error(data.error || 'Erro ao alterar senha');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Reset de Senha Administrativo</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Email do Usuário</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@email.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Nova Senha</label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="123"
          />
        </div>

        <Button 
          onClick={handleResetPassword} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Alterando..." : "Alterar Senha"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Esta função usa a API administrativa do Supabase para alterar senhas sem validações de complexidade.
      </p>
    </Card>
  );
};
