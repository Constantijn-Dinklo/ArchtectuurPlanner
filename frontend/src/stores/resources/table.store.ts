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

    async function deleteTable(tableId: string) {
        const res = await api.delete(`/tables/${tableId}`);
        tables.value = tables.value.filter((table) => table.id !== res.data.resourceId);
        return res.data;
    }

    function getTables(databaseId: string) {
        return tables.value.filter((table) => table.databaseId === databaseId)
    }

    async function createColumn(tableId: string, columnName: string) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        table.columns.push(columnName);
        const res = await api.patch(`/tables/${tableId}`, table);
        
        //Remove column if the backend had an error
        if(res.status === 200) { return; }
        table.columns.pop();
    }

    async function deleteColumn(tableId: string, columnName: string) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        const oldColumns = table.columns;
        table.columns = table.columns.filter(column => column !== columnName);
        const res = await api.patch(`/tables/${tableId}`, table);
        
        if(res.status === 200) { return; }
        table.columns = oldColumns;
    }

    return { tables, fetchTables, createTable, deleteTable, getTables, createColumn, deleteColumn }
});