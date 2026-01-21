import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Globe, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOURCES_PER_PAGE = 10;

export default function Sources() {
  const { sources, refreshFeed } = useStore();
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"official" | "media" | "blog">("media");
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(sources.length / SOURCES_PER_PAGE));
  
  const paginatedSources = useMemo(() => {
    return sources.slice(
      (currentPage - 1) * SOURCES_PER_PAGE,
      currentPage * SOURCES_PER_PAGE
    );
  }, [sources, currentPage]);

  const handleAddSource = async () => {
    if (!newUrl || !newName) {
      toast.error("Preencha o nome e a URL da fonte");
      return;
    }

    setIsAdding(true);
    try {
      await api.createSource({
        name: newName,
        url: newUrl,
        rssUrl: newUrl,
        type: newType,
        trusted: newType === "official" || newType === "media",
      });
      
      setNewUrl("");
      setNewName("");
      toast.success("Fonte adicionada com sucesso!");
      // Simply reload to refresh the source list. Wouter handles the URL.
      window.location.reload(); 
    } catch (error) {
      toast.error("Erro ao adicionar fonte");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a fonte "${name}"?`)) return;

    try {
      await api.deleteSource(id);
      toast.success("Fonte removida");
      window.location.reload();
    } catch (error) {
      toast.error("Erro ao remover fonte");
    }
  };

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
        <div className="space-y-3">
          <Input 
            placeholder="Nome da fonte" 
            className="text-lg h-12"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-testid="input-source-name"
          />
          <Input 
            placeholder="Cole o link do RSS aqui..." 
            className="text-lg h-12"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            data-testid="input-source-url"
          />
          <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
            <SelectTrigger className="h-12 text-lg" data-testid="select-source-type">
              <SelectValue placeholder="Tipo de fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="official">Oficial (Gov/Ciência)</SelectItem>
              <SelectItem value="media">Grande Veículo</SelectItem>
              <SelectItem value="blog">Blog/Independente</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="lg" 
            className="w-full h-12" 
            onClick={handleAddSource}
            disabled={isAdding}
            data-testid="button-add-source"
          >
            <Plus className="mr-2 w-5 h-5" /> Adicionar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          * Novas fontes são adicionadas instantaneamente. Clique em atualizar no feed para buscar notícias.
        </p>
      </Card>

      <div className="grid gap-4">
        {paginatedSources.map(source => (
          <div key={source.id} className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm" data-testid={`card-source-${source.id}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${source.trusted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {source.trusted ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-lg" data-testid={`text-source-name-${source.id}`}>{source.name}</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Globe className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{source.url}</span>
                  <span className="bg-secondary px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                    {source.type}
                  </span>
                </div>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteSource(source.id, source.name)}
              data-testid={`button-delete-source-${source.id}`}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm font-medium">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
