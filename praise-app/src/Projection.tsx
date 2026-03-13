import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

function Projection() {
  const [data, setData] = useState<{ 
    title: string; 
    content: string; 
    background: string | null; 
    item_type: string;
    title_color?: string;
    lyrics_color?: string;
    title_font?: string;
    title_size?: number;
    title_weight?: string;
    lyrics_font?: string;
    lyrics_size?: number;
    lyrics_weight?: string;
    projection_mode?: string;
  }>({
    title: "",
    content: "",
    background: null,
    item_type: "empty"
  });

  useEffect(() => {
    // Busca o slide atual do estado do Rust assim que a janela montar
    invoke<{ 
      title: string; 
      content: string; 
      background: string | null; 
      item_type: string;
      title_color?: string;
      lyrics_color?: string;
      title_font?: string;
      title_size?: number;
      title_weight?: string;
      lyrics_font?: string;
      lyrics_size?: number;
      lyrics_weight?: string;
      projection_mode?: string;
    } | null>("get_current_slide")
      .then(slide => {
        if (slide) {
          console.log("Slide inicial carregado:", slide);
          setData(slide);
        }
      })
      .catch(err => console.error("Erro ao carregar slide inicial:", err));

    console.log("Projetor montado, aguardando eventos...");
    
    const unlisten = listen<{ 
      title: string; 
      content: string; 
      background: string | null; 
      item_type: string;
      title_color?: string;
      lyrics_color?: string;
      title_font?: string;
      title_size?: number;
      title_weight?: string;
      lyrics_font?: string;
      lyrics_size?: number;
      lyrics_weight?: string;
      projection_mode?: string;
    }>("update_projection", (event) => {
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
      {/* Camada de Fundo - oculta em modo legenda */}
      {backgroundUrl && data.projection_mode !== 'subtitle' && (
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

      {/* Overlay escuro - apenas em modo default */}
      {data.projection_mode !== 'subtitle' && (
        <div className="absolute inset-0 z-[1] bg-black/30" />
      )}

      {/* Título do louvor/versículo */}
      {data.title && data.item_type !== 'empty' && (
        <div className={`absolute left-0 right-0 z-20 w-full flex items-center justify-center transition-all duration-500 ${
          data.projection_mode === 'subtitle'
            ? 'bottom-[22%] scale-75 opacity-70' // Posiciona acima da legenda
            : data.item_type === 'bible' 
              ? 'top-[5.5%]' 
              : 'top-[5.5%]'
        }`}>
          <h1 
            className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate px-12 ${
              data.item_type === 'bible'
                ? 'text-3xl md:text-4xl lg:text-5xl' 
                : 'text-2xl md:text-3xl lg:text-4xl' 
            }`}
            style={{ 
              color: data.title_color,
              fontFamily: data.title_font ? `'${data.title_font}', sans-serif` : undefined,
              fontSize: data.title_size ? `${data.projection_mode === 'subtitle' ? data.title_size * 0.7 : data.title_size}px` : undefined,
              fontWeight: data.title_weight
            }}
          >
            {data.title}
          </h1>
        </div>
      )}

      {/* Camada de Texto */}
      <div className={`relative z-10 flex-1 w-full flex items-center justify-center transition-all duration-500 px-12 pb-8 ${
        data.projection_mode === 'subtitle'
          ? 'pt-0 items-end pb-[8%]' // Empurra para o rodapé em modo legenda
          : 'pt-32 lg:px-20 lg:pt-40'
      }`}>
        <div className="flex items-center justify-center w-full">
          <div 
            className={`font-bold leading-norm tracking-wide projection-shadow drop-shadow-2xl inline-block transition-all duration-500 ${
              data.projection_mode === 'subtitle'
                ? 'text-2xl md:text-4xl lg:text-5xl text-center max-w-[90%] overflow-hidden line-clamp-2' // Limite de 2 linhas
                : data.item_type === 'bible' 
                  ? 'text-4xl md:text-6xl lg:text-7xl italic font-medium text-center' 
                  : 'text-4xl md:text-6xl lg:text-[4.8rem] uppercase text-left'
            }`}
            style={{ 
              color: data.lyrics_color,
              fontFamily: data.lyrics_font ? `'${data.lyrics_font}', sans-serif` : undefined,
              fontSize: data.lyrics_size ? `${data.projection_mode === 'subtitle' ? Math.min(data.lyrics_size, 44) : data.lyrics_size}px` : undefined,
              fontWeight: data.lyrics_weight,
              display: data.projection_mode === 'subtitle' ? '-webkit-box' : 'inline-block',
              WebkitLineClamp: data.projection_mode === 'subtitle' ? 2 : 'none',
              WebkitBoxOrient: 'vertical'
            }}
            dangerouslySetInnerHTML={{ __html: data.content }} 
          />
        </div>
      </div>
    </div>
  );
}

export default Projection;
