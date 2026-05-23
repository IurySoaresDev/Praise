import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import { useCallback, useEffect, useState } from "react"

interface UpdaterCallbacks {
  showSuccess: (message: string, duration?: number) => void
}

async function downloadAndInstallUpdate(
  setDownloadProgress: (
    progress: { downloaded: number; total: number } | null,
  ) => void,
) {
  const update = await check()
  if (!update) return false

  let downloaded = 0
  let contentLength = 0
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data.contentLength || 0
        setDownloadProgress({ downloaded: 0, total: contentLength })
        break
      case "Progress":
        downloaded += event.data.chunkLength
        setDownloadProgress({ downloaded, total: contentLength })
        break
      case "Finished":
        setDownloadProgress(null)
        break
    }
  })

  return true
}

export function useUpdater({ showSuccess }: UpdaterCallbacks) {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number
    total: number
  } | null>(null)

  const checkForUpdate = useCallback(async () => {
    try {
      setIsCheckingUpdate(true)
      const hasUpdate = await check()
      if (hasUpdate) {
        const installed = await downloadAndInstallUpdate(setDownloadProgress)
        if (installed) {
          showSuccess("Atualização instalada. Reiniciando...")
          setTimeout(async () => {
            await relaunch()
          }, 2000)
        }
      } else {
        showSuccess("Versão atualizada!")
      }
    } catch (error) {
      console.error("Erro ao buscar atualizações:", error)
      showSuccess("Erro ao buscar atualizações.")
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [showSuccess])

  return {
    isCheckingUpdate,
    downloadProgress,
    checkForUpdate,
  }
}

/** Verifica atualizações ao abrir o app (após alguns segundos). */
export function useAutoUpdater({ showSuccess }: UpdaterCallbacks) {
  useEffect(() => {
    const isTauri = Boolean(
      typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window),
    )
    if (!isTauri) return

    const timer = setTimeout(async () => {
      try {
        const update = await check()
        if (!update) return

        showSuccess(
          `Atualização ${update.version} encontrada. Baixando...`,
          5000,
        )
        const installed = await downloadAndInstallUpdate(() => {})
        if (installed) {
          showSuccess("Atualização instalada. Reiniciando...", 3000)
          setTimeout(async () => {
            await relaunch()
          }, 2000)
        }
      } catch (error) {
        console.error("Verificação automática de atualização falhou:", error)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [showSuccess])
}
