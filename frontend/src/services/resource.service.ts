
import { computed } from "vue";

import { useDatabaseStore, type Database } from "../stores/database.store";
import { useApplicationStore, type Application } from "../stores/application.store";
import { useFileLocationStore, type FileLocation } from "../stores/fileLocation.store";
import { useServerStore, type Server } from "../stores/server.store";
import type { ResourceType } from "../types/resource.type";

export type Resource = Application | Database | FileLocation | Server;

export function useResourceService() {
    const applicationStore = useApplicationStore();
    const databaseStore = useDatabaseStore();
    const fileLocationStore = useFileLocationStore();
    const serverStore = useServerStore();

    const resources = computed(() => {
        return [
            ...applicationStore.applications,
            ...databaseStore.databases,
            ...fileLocationStore.fileLocations,
            ...serverStore.servers
        ]
    })

    const resourceMap = computed(() => {
        const map = new Map<string, Resource>();

        for(const r of databaseStore.databases) {
            map.set(r.id, {
                ...r,
                type: 'database'
            });
        }
        for(const app of applicationStore.applications) {
            map.set(app.id, {
                ...app,
                type: 'application'
            });
        }
        for(const file of fileLocationStore.fileLocations){
            map.set(file.id, {
                ...file,
                type: 'fileLocation'
            });
        }
        for(const server of serverStore.servers){
            map.set(server.id, server);
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