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

  const isSubtitle = data.projection_mode === 'subtitle' && data.item_type !== 'bible';

  return (
    <div 
      className="w-screen h-screen relative flex flex-col overflow-hidden"
      style={{ backgroundColor: isSubtitle ? '#00ff00' : '#000000' }}
    >
      {/* Camada de Fundo - oculta em modo legenda */}
      {backgroundUrl && !isSubtitle && (
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
      {!isSubtitle && (
        <div className="absolute inset-0 z-[1] bg-black/30" />
      )}

      {/* Título do louvor/versículo - oculto em modo legenda */}
      {data.title && data.item_type !== 'empty' && !isSubtitle && (
        <div className={`absolute left-0 right-0 z-20 w-full flex items-center justify-center ${
          data.item_type === 'bible' 
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
              fontSize: data.title_size ? `${data.title_size}px` : undefined,
              fontWeight: data.title_weight
            }}
          >
            {data.title}
          </h1>
        </div>
      )}

      {/* Camada de Texto */}
      {isSubtitle ? (
        /* MODO LEGENDA: texto fixo no rodapé, max 2 linhas */
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pb-[5%] px-8">
          <div 
            className="text-center font-bold drop-shadow-2xl projection-shadow"
            style={{ 
              color: data.lyrics_color || '#ffffff',
              fontFamily: data.lyrics_font ? `'${data.lyrics_font}', sans-serif` : undefined,
              fontSize: '54px',
              fontWeight: data.lyrics_weight || '700',
              lineHeight: '1.3',
              maxWidth: '85%',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '3px 3px 8px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.4)'
            }}
            dangerouslySetInnerHTML={{ __html: data.content }} 
          />
        </div>
      ) : (
        /* MODO PADRÃO: texto centralizado */
        <div className="relative z-10 flex-1 w-full flex items-center justify-center px-12 pb-8 pt-32 lg:px-20 lg:pt-40">
          <div className="flex items-center justify-center w-full">
            <div 
              className={`font-bold leading-snug tracking-wide projection-shadow drop-shadow-2xl inline-block ${
                data.item_type === 'bible' 
                  ? 'text-4xl md:text-6xl lg:text-7xl italic font-medium text-center' 
                  : 'text-4xl md:text-6xl lg:text-[4.8rem] uppercase text-left'
              }`}
              style={{ 
                color: data.lyrics_color,
                fontFamily: data.lyrics_font ? `'${data.lyrics_font}', sans-serif` : undefined,
                fontSize: data.lyrics_size ? `${data.lyrics_size}px` : undefined,
                fontWeight: data.lyrics_weight
              }}
              dangerouslySetInnerHTML={{ __html: data.content }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Projection;
