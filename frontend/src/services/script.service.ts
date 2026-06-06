import api from "../helpers/axios";

import { useCanvasStore, type CanvasEdge } from "../stores/canvas/canvas.store";
import { useScriptStore, type Script } from "../stores/script.store";


export function useScriptService() {
    const scriptStore = useScriptStore();
    const canvasStore = useCanvasStore();

    async function fetchScripts() {
        const res = await api.get('/scripts');
        const scripts = res.data as Script[];
        scriptStore.setScripts(scripts);

        scripts.map((script) => {
            const scriptEdges = makeEdgesForScript(script.inputIds, script.outputIds);
            canvasStore.updateScriptEdges(script.id, scriptEdges);
        });
    }

    async function updateScript(scriptId: string, patch: Partial<Script>) {
        const updatedScript = await scriptStore.updateScript(scriptId, patch);
        if(!updatedScript) return;

        const edges = makeEdgesForScript(updatedScript.inputIds, updatedScript.outputIds);
        canvasStore.updateScriptEdges(updatedScript.id, edges);

    }

    async function deleteScript(scriptId: string) {
        const deletedScript = await scriptStore.deleteScript(scriptId);
        if(!deletedScript) return;
        
        canvasStore.removeScriptEdges(deletedScript.id);
    }

    function makeEdgesForScript(inputIds: string[], outputIds: string[]): CanvasEdge[] {
        const edges: (CanvasEdge | undefined)[] = inputIds.flatMap(inputId => outputIds.map(outputId => {
            if(inputId === outputId) return;
            const edge: CanvasEdge = {
                id: inputId + outputId,
                source: inputId,
                target: outputId
            }
            return edge
        }));

        return edges.filter((edge) => edge !== undefined);
    }

    return { fetchScripts, updateScript, deleteScript }
}