import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Activity, Pill, TrendingUp, Target, Upload } from "lucide-react";

const tutorialSteps = [
  {
    icon: Upload,
    title: "Upload de Exames",
    description: "Tire fotos ou faça upload dos seus exames médicos. O sistema processa automaticamente usando OCR e comprime as imagens para economizar espaço.",
  },
  {
    icon: FileText,
    title: "Meus Exames",
    description: "Visualize todos os seus exames processados com análises detalhadas e comparações temporais. Converse com a IA sobre seus resultados.",
  },
  {
    icon: Activity,
    title: "Bioimpedância",
    description: "Registre suas medições de composição corporal e acompanhe a evolução de peso, massa muscular e gordura ao longo do tempo.",
  },
  {
    icon: Pill,
    title: "Medicamentos",
    description: "Gerencie seus medicamentos, incluindo GLP-1 e vitaminas injetáveis, com lembretes e controle de dosagem progressiva.",
  },
  {
    icon: TrendingUp,
    title: "Suplementos",
    description: "Receba recomendações personalizadas de suplementos baseadas nos seus exames e medições de bioimpedância.",
  },
  {
    icon: Target,
    title: "Metas",
    description: "Defina e acompanhe suas metas de saúde com notificações de progresso e conquistas ao atingir objetivos.",
  },
];

export const OnboardingTutorial = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setOpen(false);
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const CurrentIcon = tutorialSteps[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CurrentIcon className="w-5 h-5 text-primary" />
            {tutorialSteps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            {tutorialSteps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passo {currentStep + 1} de {tutorialSteps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-2 justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1"
            >
              Pular Tutorial
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                >
                  Anterior
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === tutorialSteps.length - 1 ? "Começar" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
