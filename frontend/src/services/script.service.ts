import api from "../helpers/axios";

import { useScriptStore, type Script } from "../stores/script.store";


export function useScriptService() {
    const scriptStore = useScriptStore();

    async function fetchScripts() {
        const res = await api.get('/scripts');
        const scripts = res.data as Script[];
        scriptStore.setScripts(scripts);
    }

    async function removeInput(scriptId: string, index: number) {
        const script = scriptStore.scripts.find((script) => script.id === scriptId);
        if(!script) return;
        const updatedInputs = script.inputIds.filter((_, i) => i !== index);
        await updateScript(scriptId, {
            inputIds: updatedInputs
        });
    }

    async function removeOutput(scriptId: string, index: number) {
        const script = scriptStore.scripts.find((script) => script.id === scriptId);
        if(!script) return;
        const updateOutputs = script.outputIds.filter((_, i) => i !== index);
        await updateScript(scriptId, {
            outputIds: updateOutputs
        });
    }

    async function updateScript(scriptId: string, patch: Partial<Script>) {
        await scriptStore.updateScript(scriptId, patch);
    }

    async function deleteScript(scriptId: string) {
        await scriptStore.deleteScript(scriptId);
    }

    return { fetchScripts, removeInput, removeOutput, updateScript, deleteScript }
}