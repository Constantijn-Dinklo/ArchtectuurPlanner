import { defineStore } from "pinia";
import type { BaseResource } from "../../types/resource.type";
import { ref } from "vue";
import api from "../../helpers/axios";

export interface Table extends BaseResource {
    type: 'table',
    databaseId: string;
    columns: string[];
}

export const useTableStore = defineStore('table', () => {
    const tables = ref<Table[]>([]);

    async function fetchTables() {
        const res = await api.get('/tables');
        const data = res.data as Table[];

        tables.value = data.map((t) => ({
            ...t,
            type: 'table'
        }));
    }

    async function createTable(name: string, databaseId: string, viewId: string) {
        const res = await api.post('/tables', {
            name: name,
            databaseId: databaseId,
            viewId: viewId
        });
        const newTable: Table = {
            id: res.data.table.id,
            databaseId: res.data.table.databaseId,
            name: res.data.table.name,
            type: 'table',
            columns: res.data.table.columns
        }
        tables.value.push(newTable);
        return res.data;
    }

    function getTables(databaseId: string) {
        return tables.value.filter((table) => table.databaseId === databaseId)
    }

    return { tables, fetchTables, createTable, getTables }
});