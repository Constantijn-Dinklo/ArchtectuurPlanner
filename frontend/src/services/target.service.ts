import { useApplicationStore } from "../stores/application.store";
import { useDatabaseStore } from "../stores/database.store";

export interface Target {
    targetId: string;
    name: string;
}

export function useTargetService() {
    const applicationStore = useApplicationStore();
    const databaseStore = useDatabaseStore();

    function getAllTargets() {
        const applicationTargets : Target[] = applicationStore.applications.map((app) => {
            return {
                targetId: app.id,
                name: app.name
            }
        });
        const databaseTargets: Target[] = databaseStore.databases.map((db) => {
            return {
                targetId: db.id,
                name: db.name
            }
        });

        return [
            ...applicationTargets,
            ...databaseTargets
        ]
    }

    return { getAllTargets }
}