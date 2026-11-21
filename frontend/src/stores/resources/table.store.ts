import { defineStore } from "pinia";
import { computed } from "vue";
import type { BaseResource } from "../../types/resource.type";
import type { AddInformationFieldRequest, InformationField } from "../../types/informationField.type";
import { useComponentStore } from "./component.store";
import { useInformationFieldStore } from "../information/informationField.store";
import { useInformationRelationStore } from "../information/informationRelation.store";

// A table is a component of its database (kind 'table'): it is stored and changed with the other components. This
// store shows the table components the way the rest of the app uses a table: with its database and its columns
export interface Table extends BaseResource {
    type: 'table',
    databaseId: string;
    columns: InformationField[];
}

export const useTableStore = defineStore('table', () => {
    const componentStore = useComponentStore();
    const informationFieldStore = useInformationFieldStore();

    const tables = computed<Table[]>(() => componentStore.components
        .filter(component => component.kind === 'table')
        .map(component => ({
            id: component.id,
            type: 'table' as const,
            name: component.name,
            databaseId: component.resourceId,
            columns: component.informationFieldIds
                .map(id => informationFieldStore.getInformationField(id))
                .filter(field => field !== undefined)
        }))
    );

    // The tables come with the components
    function fetchTables() {
        return componentStore.fetchComponents();
    }

    // Returns the id of the new table
    async function createTable(name: string, databaseId: string) {
        return (await componentStore.createComponent(databaseId, 'table', name))?.id;
    }

    function renameTable(tableId: string, name: string) {
        return componentStore.updateComponent(tableId, { name });
    }

    function deleteTable(tableId: string) {
        return componentStore.deleteComponent(tableId);
    }

    function getTables(databaseId: string) {
        return tables.value.filter((table) => table.databaseId === databaseId);
    }

    // A column filled from another resource also gets the relation from there to the table
    async function createColumn(tableId: string, informationField: AddInformationFieldRequest) {
        await componentStore.addInformationField(tableId, 'contains', informationField);
        if ('sourceResourceId' in informationField) await useInformationRelationStore().fetchInformationRelations();
    }

    function deleteColumn(tableId: string, informationFieldId: string) {
        return componentStore.removeInformationField(tableId, 'contains', informationFieldId);
    }

    return { tables, fetchTables, createTable, renameTable, deleteTable, getTables, createColumn, deleteColumn }
});
