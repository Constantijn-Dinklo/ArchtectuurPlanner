import { computed } from "vue";
import { useViewStore } from "../stores/canvas/view.store";
import { useServerStore, type Server } from "../stores/server.store";


export function useServerService() {
    const serverStore = useServerStore();
    const viewStore = useViewStore();

    const serverMap = computed(() => {
        const map = new Map<string, Server>();

        for(const s of serverStore.servers) {
            map.set(s.id, s);
        }

        return map;
    })

    async function createServer(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await serverStore.createServer(name, currentViewId);
        console.log(res);
        viewStore.addViewNode(res.viewNode);
    }

    function getServer(id: string): Server | undefined {
        return serverMap.value.get(id);
    }

    return { createServer, getServer }
}