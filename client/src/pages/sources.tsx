import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Globe, ShieldCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function Sources() {
  const { sources } = useStore();
  const [newUrl, setNewUrl] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary">Fontes Monitoradas</h1>
        <p className="text-lg text-muted-foreground">
          O Verifica cruza informações apenas de lugares seguros. Aqui você vê quem nós escutamos.
        </p>
      </div>

      <Card className="p-6 space-y-4 border-2 border-dashed">
        <h3 className="font-bold text-xl">Adicionar Fonte (RSS)</h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Cole o link do RSS aqui..." 
            className="text-lg h-12"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Button size="lg" className="shrink-0 h-12">
            <Plus className="mr-2 w-5 h-5" /> Adicionar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          * Novas fontes passam por uma análise automática de confiabilidade antes de entrarem no feed principal.
        </p>
      </Card>

      <div className="grid gap-4">
        {sources.map(source => (
          <div key={source.id} className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${source.trusted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {source.trusted ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-lg">{source.name}</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Globe className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{source.url}</span>
                  <span className="bg-secondary px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                    {source.type}
                  </span>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
