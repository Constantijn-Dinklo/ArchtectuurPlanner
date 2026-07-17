import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from 'primevue';

import api from "../../helpers/axios";
import type { BaseResource } from "../../types/resource.type";

export interface Database extends BaseResource {
    type: 'database';
    engine?: string;
}

export const useDatabaseStore = defineStore('database', () => {
    const databases = ref<Database[]>([]);

    const toast = useToast();

    async function  fetchDatabases() {
        const res = await api.get('/databases');
        const data = res.data as Database[];

        databases.value = data.map((d) => ({ 
            ...d,
            type: 'database'
        }));
    }

    async function createDatabase(name: string, viewId: string) {
        const res = await api.post('/databases', {
            name: name,
            viewId: viewId
        });
        const newDatabase: Database = {
            id: res.data.database.id,
            name: res.data.database.name,
            type: 'database'
        }
        databases.value.push(newDatabase);
        return res.data;
    }

    async function updateDatabase(id: string, patch: Partial<Database>) {
        const res = await api.patch(`/databases/${id}`, patch);
        const database = databases.value.find(d => d.id === id);
        if(!database) return;
        const result: Database = Object.assign(database, res.data);
        return result;
    }
    
    async function deleteDatabase(id: string) {
        try {
            const res = await api.delete(`/databases/${id}`);
            databases.value = databases.value.filter((database) => database.id !== res.data.resourceId);
            return res.data;
        }
        catch(error: any) {
            if(error.response?.status === 409){
                toast.add({
                    severity: 'warn',
                    summary: error.response.data.message,
                    life: 3000
                })
            }
        }
    }
    


    return { databases, fetchDatabases, createDatabase, updateDatabase, deleteDatabase }
})