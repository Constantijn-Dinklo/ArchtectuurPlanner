import { useUIStore } from "../stores/canvas/ui.store"
import { useApplicationStore } from "../stores/resources/application.store"
import { useDatabaseStore } from "../stores/resources/database.store"
import { useFileLocationStore } from "../stores/resources/fileLocation.store"
import { useServerStore } from "../stores/resources/server.store"
import { useTableStore } from "../stores/resources/table.store"
import { type LevelOfDetail, getVisibleResourceTypes } from "../types/levelOfDetail"


export function useArchitectureViewService() {
  const UIStore = useUIStore();

  const applicationStore = useApplicationStore();
  const databaseStore = useDatabaseStore();
  const fileLocationStore = useFileLocationStore();
  const tableStore = useTableStore();
  const serverStore = useServerStore();

  async function changeLevelOfDetail(level: LevelOfDetail) {
    // 1. Update UI state
    UIStore.setLevelOfDetail(level);

    // 2. Determine required resource types
    const visibleTypes = getVisibleResourceTypes(level);

    // 3. Fetch missing data
    const fetchPromises: Promise<unknown>[] = []

    if (visibleTypes.includes('application')) {
      fetchPromises.push(applicationStore.fetchApplications())
    }

    if (visibleTypes.includes('database')) {
      fetchPromises.push(databaseStore.fetchDatabases())
    }

    if(visibleTypes.includes('fileLocation')) {
        fetchPromises.push(fileLocationStore.fetchFileLocations());
    }

    if (visibleTypes.includes('table')) {
      fetchPromises.push(tableStore.fetchTables())
    }

    if (visibleTypes.includes('server')) {
      fetchPromises.push(serverStore.fetchServers())
    }

    await Promise.all(fetchPromises)
  }

  return {
    changeLevelOfDetail,
  }
}