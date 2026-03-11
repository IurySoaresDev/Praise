import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";

function Projection() {
  const [data, setData] = useState<{ title: string; content: string; background: string | null; item_type: string }>({
    title: "",
    content: "",
    background: null,
    item_type: "empty"
  });

  useEffect(() => {
    console.log("Projetor montado, aguardando eventos...");
    
    const unlisten = listen<{ title: string; content: string; background: string | null; item_type: string }>("update_projection", (event) => {
      console.log("Evento recebido no projetor:", event.payload);
      setData(event.payload);
    });

    return () => {
      unlisten.then(f => f());
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
      {/* Camada de Fundo - cobre 100% da tela */}
      {backgroundUrl && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Overlay escuro para melhorar contraste */}
      <div className="absolute inset-0 z-[1] bg-black/30" />

      {/* Título do louvor no topo (na faixa vermelha da imagem) */}
      {data.title && data.item_type !== 'empty' && (
        <div className="relative z-10 w-full pt-4 pb-3 px-8 flex items-center justify-center" 
             style={{ minHeight: '80px' }}>
          <h1 className="text-white text-2xl md:text-3xl font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow">
            {data.title}
          </h1>
        </div>
      )}

      {/* Camada de Texto - letra da estrofe centralizada */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center px-12 pb-12 lg:px-20 lg:pb-20">
        <div 
          className={`text-white font-bold text-center w-full leading-snug tracking-wide projection-shadow drop-shadow-2xl ${
            data.item_type === 'bible' 
              ? 'text-3xl md:text-4xl lg:text-5xl italic font-medium' 
              : 'text-3xl md:text-5xl lg:text-7xl uppercase'
          }`}
          dangerouslySetInnerHTML={{ __html: data.content }} 
        />
      </div>
    </div>
  );
}

export default Projection;
