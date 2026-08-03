import { defineStore } from "pinia";
import type { BaseResource } from "../../types/resource.type";
import { ref } from "vue";
import api from "../../helpers/axios";
import type { InformationField } from "../../types/informationField.type";

export interface Table extends BaseResource {
    type: 'table',
    databaseId: string;
    columns: InformationField[];
}

export const useTableStore = defineStore('table', () => {
    const tables = ref<Table[]>([]);

    async function fetchTables() {
        const res = await api.get('/tables');
        const data = res.data as Table[];
        console.log(data);

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
        const res = await api.post(`/tables/${tableId}/column`, {
            tableId,
            fieldName: columnName
        });

        table.columns.push(res.data);
    }

    async function deleteColumn(tableId: string, fieldId: string) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        const oldColumns = table.columns;
        table.columns = table.columns.filter(column => column.id !== fieldId);
        console.log(table);
        const res = await api.patch(`/tables/${tableId}`, table);
        
        if(res.status === 200) { return; }
        table.columns = oldColumns;
    }

    return { tables, fetchTables, createTable, deleteTable, getTables, createColumn, deleteColumn }
});