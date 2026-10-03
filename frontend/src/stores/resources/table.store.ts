import { defineStore } from "pinia";
import type { BaseResource } from "../../types/resource.type";
import { ref } from "vue";
import api from "../../helpers/axios";
import type { AddInformationFieldRequest, InformationField } from "../../types/informationField.type";

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

    async function renameTable(tableId: string, name: string) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        await api.patch(`/tables/${tableId}`, { name });
        table.name = name;
    }

    async function deleteTable(tableId: string) {
        const res = await api.delete(`/tables/${tableId}`);
        tables.value = tables.value.filter((table) => table.id !== res.data.resourceId);
        return res.data;
    }

    function getTables(databaseId: string) {
        return tables.value.filter((table) => table.databaseId === databaseId)
    }

    async function createColumn(tableId: string, informationField: AddInformationFieldRequest) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        const res = await api.post(`/tables/${tableId}/columns`, {
            tableId,
            informationField
        });
        Object.assign(table, res.data);
    }

    async function deleteColumn(tableId: string, informationFieldId: string) {
        const table = tables.value.find(t => t.id === tableId);
        if(!table) return;
        const res = await api.patch(`/tables/${tableId}/columns`, {
            informationFieldId
        });
        Object.assign(table, res.data);
    }

    return { tables, fetchTables, createTable, renameTable, deleteTable, getTables, createColumn, deleteColumn }
});