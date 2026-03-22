import { useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdaterCallbacks {
  showSuccess: (message: string, duration?: number) => void;
}

export function useUpdater({ showSuccess }: UpdaterCallbacks) {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number;
    total: number;
  } | null>(null);

  const checkForUpdate = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await check();
      if (update) {
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              setDownloadProgress({ downloaded: 0, total: contentLength });
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              setDownloadProgress({ downloaded, total: contentLength });
              break;
            case 'Finished':
              setDownloadProgress(null);
              break;
          }
        });
        showSuccess('Atualização instalada. Reiniciando...');
        setTimeout(async () => {
          await relaunch();
        }, 2000);
      } else {
        showSuccess('Versão atualizada!');
      }
    } catch {
      showSuccess('Erro ao buscar atualizações.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return {
    isCheckingUpdate,
    downloadProgress,
    checkForUpdate,
  };
}
