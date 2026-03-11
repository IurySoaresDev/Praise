import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";

function Projection() {
  const [data, setData] = useState<{ content: string; background: string | null; item_type: string }>({
    content: "",
    background: null,
    item_type: "empty"
  });

  useEffect(() => {
    console.log("Projetor montado, aguardando eventos...");
    
    // Escuta o evento "update_projection" vindo da main window
    const unlisten = listen<{ content: string; background: string | null; item_type: string }>("update_projection", (event) => {
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

  // Se o background for um path local do arquivo (não começa com /backgrounds/), converte pra URL tauri
  const backgroundUrl = data.background 
    ? (data.background.startsWith('/') ? data.background : convertFileSrc(data.background))
    : null;

  return (
    <div className="w-screen h-screen bg-black relative flex items-center justify-center overflow-hidden">
      {/* Camada de Fundo */}
      {backgroundUrl && (
        <div className="absolute inset-0 z-0 scale-105 animate-fade-in">
          <img 
            src={backgroundUrl} 
            className="w-full h-full object-cover opacity-70" 
            alt="background"
            onError={(e) => console.error("Erro ao carregar imagem de fundo:", backgroundUrl, e)}
          />
          {/* Overlay escuro para melhorar contraste do texto */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Camada de Texto */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-12 lg:p-20">
        <div 
          className={`text-white font-bold text-center w-full leading-snug tracking-wide projection-shadow drop-shadow-2xl ${
            data.item_type === 'bible' 
              ? 'text-4xl md:text-5xl lg:text-5xl italic font-medium' 
              : 'text-4xl md:text-6xl lg:text-8xl uppercase'
          }`}
          dangerouslySetInnerHTML={{ __html: data.content }} 
        />
      </div>
    </div>
  );
}

export default Projection;
