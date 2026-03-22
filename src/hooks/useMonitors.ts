import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

export interface MonitorInfo {
  name: string
  label: string
}

export function useMonitors() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([])
  const [selectedMonitor, setSelectedMonitor] = useState<string>("")

  useEffect(() => {
    const getMonitors = async () => {
      try {
        const result = await invoke<MonitorInfo[]>("get_monitors")
        setMonitors(result)
        if (result.length > 0) setSelectedMonitor(result[0].name)
      } catch (e) {
        console.error("Failed to get monitors:", e)
      }
    }
    getMonitors()
  }, [])

  return {
    monitors,
    selectedMonitor,
    setSelectedMonitor,
  }
}
