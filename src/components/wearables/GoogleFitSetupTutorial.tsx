import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ExternalLink, Smartphone, Key, Link as LinkIcon, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GoogleFitSetupTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
}

const SETUP_STEPS = [
  {
    id: 1,
    title: "Acesse o Google Cloud Console",
    icon: ExternalLink,
    description: "Crie um projeto no Google Cloud Platform para acessar as APIs necessárias",
    details: [
      "Acesse console.cloud.google.com",
      "Faça login com sua conta Google",
      "Crie um novo projeto ou selecione um existente",
    ],
    link: "https://console.cloud.google.com/",
  },
  {
    id: 2,
    title: "Ative a Google Fitness API",
    icon: Activity,
    description: "Habilite a API de Fitness para seu projeto acessar dados de saúde",
    details: [
      "No menu lateral, vá em 'APIs & Services' → 'Library'",
      "Busque por 'Fitness API'",
      "Clique em 'Enable' para ativar",
    ],
  },
  {
    id: 3,
    title: "Configure a Tela de Consentimento",
    icon: Smartphone,
    description: "Configure as permissões e informações que os usuários verão ao autorizar",
    details: [
      "Vá em 'APIs & Services' → 'OAuth consent screen'",
      "Escolha 'External' como tipo de usuário",
      "Preencha nome do app, email de suporte e domínio",
      "Adicione os escopos: fitness.activity.read, fitness.heart_rate.read, fitness.sleep.read",
    ],
  },
  {
    id: 4,
    title: "Crie Credenciais OAuth 2.0",
    icon: Key,
    description: "Gere as credenciais necessárias para autenticação",
    details: [
      "Vá em 'APIs & Services' → 'Credentials'",
      "Clique em 'Create Credentials' → 'OAuth client ID'",
      "Escolha 'Web application'",
      "Em 'Authorized redirect URIs', adicione:",
      "https://irlfnzxmeympvsslbnwn.supabase.co/functions/v1/google-fit-auth",
      "Copie o Client ID e Client Secret gerados",
    ],
    critical: true,
  },
  {
    id: 5,
    title: "Configure os Secrets no Sistema",
    icon: LinkIcon,
    description: "Já foi configurado! As credenciais foram salvas com segurança",
    details: [
      "✅ GOOGLE_FIT_CLIENT_ID configurado",
      "✅ GOOGLE_FIT_CLIENT_SECRET configurado",
      "Agora você pode conectar sua conta Google Fit",
    ],
    completed: true,
  },
];

export const GoogleFitSetupTutorial = ({ open, onOpenChange, onConnect }: GoogleFitSetupTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConnect = () => {
    onConnect();
    onOpenChange(false);
  };

  const step = SETUP_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="w-6 h-6 text-primary" />
            Guia de Configuração Google Fit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center justify-between gap-2">
            {SETUP_STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    idx <= currentStep
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  } ${idx === currentStep ? "ring-2 ring-primary ring-offset-2" : ""}`}
                >
                  {idx < currentStep || s.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </button>
                {idx < SETUP_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-1 rounded ${
                      idx < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card className={step.critical ? "border-orange-200 bg-orange-50/50" : step.completed ? "border-green-200 bg-green-50/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg ${step.completed ? "bg-green-100" : step.critical ? "bg-orange-100" : "bg-primary/10"}`}>
                  <StepIcon className={`w-6 h-6 ${step.completed ? "text-green-600" : step.critical ? "text-orange-600" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    {step.critical && (
                      <Badge variant="outline" className="border-orange-500 text-orange-700">
                        Crítico
                      </Badge>
                    )}
                    {step.completed && (
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        ✓ Completo
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">{step.description}</p>
                </div>
              </div>

              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                {step.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Circle className="w-2 h-2 mt-2 flex-shrink-0 fill-current text-primary" />
                    <p className="text-sm text-foreground">{detail}</p>
                  </div>
                ))}
              </div>

              {step.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => window.open(step.link, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Google Cloud Console
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Anterior
            </Button>

            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {SETUP_STEPS.length}
            </span>

            {currentStep === SETUP_STEPS.length - 1 ? (
              <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700">
                <Activity className="w-4 h-4 mr-2" />
                Conectar Google Fit
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
