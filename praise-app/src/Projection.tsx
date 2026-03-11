import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

function Projection() {
  const [data, setData] = useState<{ title: string; content: string; background: string | null; item_type: string }>({
    title: "",
    content: "",
    background: null,
    item_type: "empty"
  });

  useEffect(() => {
    // Busca o slide atual do estado do Rust assim que a janela montar
    invoke<{ title: string; content: string; background: string | null; item_type: string } | null>("get_current_slide")
      .then(slide => {
        if (slide) {
          console.log("Slide inicial carregado:", slide);
          setData(slide);
        }
      })
      .catch(err => console.error("Erro ao carregar slide inicial:", err));

    console.log("Projetor montado, aguardando eventos...");
    
    const unlisten = listen<{ title: string; content: string; background: string | null; item_type: string }>("update_projection", (event) => {
      console.log("Evento recebido no projetor:", event.payload);
      setData(event.payload);
    });

    // Tecla ESC fecha a janela de projeção (essencial para Windows fullscreen)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        getCurrentWindow().close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlisten.then(f => f());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!data.content && data.item_type === 'empty') {
    return <div className="w-screen h-screen bg-black" />;
  }

  const backgroundUrl = data.background 
    ? (data.background.startsWith('/backgrounds/') ? data.background : convertFileSrc(data.background))
    : null;

  return (
    <div className="w-screen h-screen bg-black relative flex flex-col overflow-hidden">
      {/* Camada de Fundo - cobre 100% da tela exatamente como original */}
      {backgroundUrl && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Overlay escuro para melhorar contraste */}
      <div className="absolute inset-0 z-[1] bg-black/30" />

      {/* Título do louvor/versículo no topo (na faixa da imagem) */}
      {data.title && data.item_type !== 'empty' && (
        <div className={`absolute left-0 right-0 z-20 w-full flex items-center justify-center ${
          data.item_type === 'bible' 
            ? 'top-[21%]' // Posição para a faixa da Bíblia (mais para baixo)
            : 'top-[5.5%]' // Posição para a faixa do Louvor
        }`}>
          <h1 className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate px-12 ${
            data.item_type === 'bible'
              ? 'text-white text-3xl md:text-4xl lg:text-5xl' // Título da Bíblia branco e um pouco maior
              : 'text-amber-400 text-2xl md:text-3xl lg:text-4xl' // Título do louvor amarelo
          }`}>
            {data.title}
          </h1>
        </div>
      )}

      {/* Camada de Texto - letra da estrofe centralizada */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center px-12 pb-8 pt-32 lg:px-20 lg:pt-40">
        <div 
          className={`text-white font-bold text-center w-full leading-snug tracking-wide projection-shadow drop-shadow-2xl ${
            data.item_type === 'bible' 
              ? 'text-4xl md:text-6xl lg:text-7xl italic font-medium' 
              : 'text-4xl md:text-6xl lg:text-[4.8rem] uppercase'
          }`}
          dangerouslySetInnerHTML={{ __html: data.content }} 
        />
      </div>
    </div>
  );
}

export default Projection;
