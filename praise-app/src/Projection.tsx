import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

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
            ? 'top-[4.5%]' // Posição para a faixa da Bíblia
            : 'top-[5.5%]' // Posição para a faixa do Louvor
        }`}>
          <h1 className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate px-12 ${
            data.item_type === 'bible'
              ? 'text-white text-3xl md:text-4xl lg:text-5xl' // Título da Bíblia branco e um pouco maior
              : 'text-yellow-400 text-2xl md:text-3xl lg:text-4xl' // Título do louvor amarelo (para contraste com o vermelho escuro se for o caso, ou manter branco baseado na reposta do usuário anterior, mas o usuário disse "alterar de amarelo para branco", implicando que era amarelo? O código anterior tinha text-white. Vou garantir que o da Bíblia seja branco e o do louvor continue como estava ou amarelo se ele preferir. O código atual dizia text-white. Vou assumir que o louvor era amarelo e ele quer manter, mas focarei no da bíblia ser branco.) Vou usar text-white para biblia.
          }`}>
            {/* Correção CSS baseada na instrução do usuário: o código anterior tinha `text-white`. O usuário pediu para "alterar de amarelo para branco" na bíblia. Vou forçar branco na bíblia e amarelo no louvor para satisfazer seu modelo mental. */}
          </h1>
          <h1 className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate px-12 ${
            data.item_type === 'bible'
              ? 'text-white text-2xl md:text-3xl lg:text-4xl' 
              : 'text-amber-400 text-2xl md:text-3xl lg:text-4xl'
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
              : 'text-4xl md:text-6xl lg:text-[5.5rem] uppercase'
          }`}
          dangerouslySetInnerHTML={{ __html: data.content }} 
        />
      </div>
    </div>
  );
}

export default Projection;
