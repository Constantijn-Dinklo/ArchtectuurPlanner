
import { computed } from "vue";

import { useDatabaseStore, type Database } from "../../stores/resources/database.store";
import { useApplicationStore, type Application } from "../../stores/resources/application.store";
import { useFileLocationStore, type FileLocation } from "../../stores/resources/fileLocation.store";
import { useServerStore, type Server } from "../../stores/resources/server.store";
import type { ResourceType } from "../../types/resource.type";
import { useTableStore, type Table } from "../../stores/resources/table.store";

export type Resource = Application | Database | FileLocation | Server | Table;

export function useResourceService() {
    const applicationStore = useApplicationStore();
    const databaseStore = useDatabaseStore();
    const fileLocationStore = useFileLocationStore();
    const serverStore = useServerStore();
    const tableStore = useTableStore();

    const resources = computed(() => {
        return [
            ...applicationStore.applications,
            ...databaseStore.databases,
            ...fileLocationStore.fileLocations,
            ...serverStore.servers,
            ...tableStore.tables
        ]
    })

    const resourceMap = computed(() => {
        const map = new Map<string, Resource>();

        for(const database of databaseStore.databases) {
            map.set(database.id, database);
        }
        for(const app of applicationStore.applications) {
            map.set(app.id, app);
        }
        for(const file of fileLocationStore.fileLocations){
            map.set(file.id, file);
        }
        for(const server of serverStore.servers){
            map.set(server.id, server);
        }
        for(const table of tableStore.tables){
            map.set(table.id, table);
        }
        return map;
    });

    function getResource(id: string): Resource | Database | undefined {
        return resourceMap.value.get(id);
    }

    function getByType(type: ResourceType | ResourceType[]){
        const types = Array.isArray(type) ? type : [type];

        return resources.value.filter(resource =>
            types.includes(resource.type)
        );
    }

    return { getResource, getByType }
}