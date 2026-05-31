import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export interface Script {
    id: string;
    name: string;
    inputIds: string[];
    outputIds: string[];
}

export const useScriptStore = defineStore('script', () => {
    const scripts = ref<Script[]>([]);

    function setScripts(data: Script[]) {
        scripts.value = data;
    }

    async function createScript(name: string) {
        const res = await api.post('/scripts', {
            name: name
        });

        const newScript: Script = {
            id: res.data.id,
            name: res.data.name,
            inputIds: [],
            outputIds: []
        }

        scripts.value.push(newScript);

        return newScript.id;
    }

    async function addInput(scriptId: string) {
        const script = scripts.value.find((script) => script.id === scriptId);
        if(!script) return;

        script.inputIds.push('');
    }

    async function addOutput(scriptId: string) {
        const script = scripts.value.find((script) => script.id === scriptId);
        if(!script) return;

        script.outputIds.push('');
    }

    async function updateScript(id: string, patch: Partial<Script>) {
        const res = await api.patch(`/scripts/${id}`, patch);
        const script = scripts.value.find(c => c.id === id);
        if(!script) return;
        const result: Script = Object.assign(script, res.data);
        return result;
    }

    async function deleteScript(scriptId: string) {
        const res = await api.delete(`/scripts/${scriptId}`);
        const data = res.data as Script;
        if(!data) return;
        scripts.value = scripts.value.filter((script) => script.id !== scriptId);
        return data;
    }

    return { scripts, setScripts, createScript, addInput, addOutput, updateScript, deleteScript }
})