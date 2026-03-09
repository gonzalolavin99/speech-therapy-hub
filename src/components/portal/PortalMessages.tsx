import { useState, useRef, useEffect } from "react";
import type { PortalMessage } from "@/hooks/usePatientPortal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  messages: PortalMessage[];
  professionalName: string;
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
}

export function PortalMessages({ messages, professionalName, onSendMessage, isSending }: Props) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = newMessage.trim();
    if (!msg) return;
    setNewMessage("");
    await onSendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return time;
    if (isYesterday) return `Ayer ${time}`;
    return `${date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} ${time}`;
  };

  return (
    <div className="space-y-4">
      {/* Messages Container */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="h-[400px] sm:h-[500px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin mensajes</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Envía un mensaje a {professionalName}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isPatient = msg.sender_type === 'patient';
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    isPatient ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    isPatient
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {!isPatient && (
                      <p className="text-[10px] font-medium opacity-70 mb-0.5 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {professionalName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isPatient ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="h-[44px] px-3"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}
