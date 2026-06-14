import api from "../helpers/axios";

import { useScriptStore, type Script } from "../stores/script.store";


export function useScriptService() {
    const scriptStore = useScriptStore();

    async function fetchScripts() {
        const res = await api.get('/scripts');
        const scripts = res.data as Script[];
        scriptStore.setScripts(scripts);
    }

    async function updateScript(scriptId: string, patch: Partial<Script>) {
        await scriptStore.updateScript(scriptId, patch);
    }

    async function deleteScript(scriptId: string) {
        await scriptStore.deleteScript(scriptId);
    }

    return { fetchScripts, updateScript, deleteScript }
}