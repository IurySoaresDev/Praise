import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

function Projection() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    // Escuta o evento "update_projection" vindo da main window
    const unlisten = listen<{ content: string }>("update_projection", (event) => {
      setContent(event.payload.content);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center p-8 overflow-hidden">
      {content && (
        <div 
          className="text-white text-4xl md:text-5xl lg:text-7xl font-bold text-left max-w-full leading-snug tracking-wide projection-shadow"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      )}
    </div>
  );
}

export default Projection;
