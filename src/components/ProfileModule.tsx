import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Mail, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources";

interface ProfileModuleProps {
  onNavigate: (view: View) => void;
}

export const ProfileModule = ({ onNavigate }: ProfileModuleProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setDisplayName(profile.display_name || "");
        }

        // Check user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setUserRole(roleData?.role || null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-gradient-header text-white p-4 pb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("dashboard")}
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Perfil</h1>
              {userRole === 'admin' && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <p className="text-white/80 text-xs mt-0.5">Configurações da conta</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Gerencie seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Digite seu nome"
              />
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Role Management Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Função do Usuário
            </CardTitle>
            <CardDescription>
              Sua função atual no sistema: <strong className="text-primary">{userRole || 'usuário'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRole !== 'admin' && (
              <Button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { error } = await supabase
                      .from("user_roles")
                      .upsert({ 
                        user_id: user.id, 
                        role: 'admin' 
                      });
                    
                    if (error) throw error;
                    
                    toast({
                      title: "Sucesso!",
                      description: "Você agora é um administrador. Recarregue a página para ver o botão Recursos na barra inferior.",
                    });
                    
                    await loadUserData();
                  } catch (error) {
                    console.error("Erro:", error);
                    toast({
                      title: "Erro",
                      description: "Não foi possível alterar a função",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Tornar-me Admin (para teste)
              </Button>
            )}
            {userRole === 'admin' && (
              <p className="text-sm text-muted-foreground">
                ✓ Você tem acesso ao módulo Recursos na barra inferior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              variant="secondary"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full"
        >
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};
