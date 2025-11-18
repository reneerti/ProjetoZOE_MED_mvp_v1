import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExamChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Função para renderizar markdown simples (negritos e emojis)
const renderMarkdown = (text: string) => {
  // Converter **texto** para <strong>texto</strong>
  const withBold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Quebras de linha
  const withBreaks = withBold.replace(/\n/g, '<br />');
  return withBreaks;
};

export const ExamChatDialog = ({ open, onOpenChange }: ExamChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! 👋 Sou a **Zoe**, sua assistente de saúde.\n\nEstou aqui para ajudar você a entender melhor seus **exames** e **resultados** de forma clara e objetiva.\n\n💡 Como posso ajudar hoje?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      loadDynamicSuggestions();
    }
  }, [open]);

  const loadDynamicSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar exames recentes
      const { data: examImages } = await supabase
        .from('exam_images')
        .select('*, exam_categories(name, icon)')
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .order('exam_date', { ascending: false })
        .limit(3);

      // Buscar resultados dos exames
      const examIds = examImages?.map(e => e.id) || [];
      const { data: results } = await supabase
        .from('exam_results')
        .select('parameter_name, value, status')
        .in('exam_image_id', examIds)
        .limit(10);

      // Buscar análise de saúde
      const { data: analysis } = await supabase
        .from('health_analysis')
        .select('analysis_summary, attention_points')
        .eq('user_id', user.id)
        .single();

      // Gerar sugestões dinâmicas
      const suggestions: string[] = [];

      // Sugestões baseadas em categorias de exames
      const categories = new Set(examImages?.map(e => e.exam_categories?.name).filter(Boolean));
      if (categories.has('Hemograma')) {
        suggestions.push('O que significa cada parâmetro do meu hemograma?');
      }

      // Sugestões baseadas em resultados alterados
      const alteredResults = results?.filter(r => r.status && r.status !== 'normal') || [];
      if (alteredResults.length > 0) {
        const param = alteredResults[0].parameter_name;
        suggestions.push(`Por que meu ${param} está alterado e o que fazer?`);
      }

      // Sugestões baseadas em pontos de atenção
      if (analysis?.attention_points && Array.isArray(analysis.attention_points) && analysis.attention_points.length > 0) {
        suggestions.push('Quais são meus principais pontos de atenção?');
      }

      // Sugestões baseadas na análise patient_view
      if (analysis?.analysis_summary && typeof analysis.analysis_summary === 'object') {
        const summary = analysis.analysis_summary as any;
        if (summary.patient_view?.key_insights && Array.isArray(summary.patient_view.key_insights)) {
          const insights = summary.patient_view.key_insights;
          if (insights.length > 0) {
            suggestions.push('Como posso melhorar meus resultados de saúde?');
          }
        }
      }

      // Sugestões genéricas inteligentes
      if (examImages && examImages.length > 0) {
        suggestions.push('Que perguntas devo fazer ao médico na próxima consulta?');
        suggestions.push('Quais hábitos saudáveis são recomendados para mim?');
      }

      // Fallback se não houver exames
      if (suggestions.length === 0) {
        suggestions.push(
          'Como funciona a plataforma Zoe Med?',
          'Quais exames devo fazer regularmente?',
          'Como interpretar resultados de exames?'
        );
      }

      // Limitar a 3 sugestões
      setSuggestedQuestions(suggestions.slice(0, 3));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestedQuestions([
        'Como funciona a plataforma Zoe Med?',
        'Quais exames devo fazer regularmente?',
        'Como interpretar resultados de exames?'
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-exams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({
              role: m.role,
              content: m.content
            }))
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao comunicar com a IA');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages([
                  ...newMessages,
                  { role: "assistant", content: assistantMessage }
                ]);
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || "Erro ao enviar mensagem");
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Chat com Zoe - Assistente de Saúde
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                    style={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length === 1 && (
          <div className="px-6 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Sugestões personalizadas:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDynamicSuggestions}
                disabled={loadingSuggestions}
                className="h-6 text-xs"
              >
                {loadingSuggestions ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Atualizar
                  </>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando sugestões baseadas em seus exames...
                </div>
              ) : (
                suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestion(question)}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta sobre seus exames..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 A Zoe é educativa, mas sempre consulte seu médico para decisões importantes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};