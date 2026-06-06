import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../../helpers/axios";

export interface View {
    id: string;
    name: string;
}

export interface ViewNode {
    id: string;
    viewId: string;

    resourceId: string;
    
    position: {
        x: number;
        y: number;
    }
}

export const useViewStore = defineStore('view', () => {
    const currentViewId = ref<string>('');
    const views = ref<View[]>([]);
    const viewNodes = ref<ViewNode[]>([]);

    async function fetchViews() {
        const res = await api.get('/views');
        const data = res.data as View[];

        views.value = data;

        if(views.value.length > 0){
            currentViewId.value = views.value[0].id; 
            await fetchViewNodes(currentViewId.value);
        }
    }

    async function fetchViewNodes(viewId: string) {
        const res = await api.get(`/views/${viewId}/nodes`);
        const data = res.data;

        data.map((viewNode: any) => {
            if(viewNodes.value.find((v) => v.id === viewNode.id)) return;
            viewNodes.value.push(viewNode);
        });
    }

    async function createViewNode(resourceId: string) {
        const res = await api.post(`/views/${currentViewId.value}/nodes`, {
            viewId: currentViewId.value,
            resourceId: resourceId
        });
        const data = res.data as ViewNode;

        viewNodes.value.push(data);
    }

    async function updateViewNodePosition(nodeId: string, position: {x: number, y: number}) {
        const viewId = currentViewId;
        if(!viewId) return;

        const updatedNode = viewNodes.value.find((vn) =>vn.id === nodeId);
        if(!updatedNode) return;
        updatedNode.position = position;

        await api.patch(`/views/${viewId.value}/nodes/${nodeId}`, {
            position
        });
    }

    return { viewNodes, fetchViews, fetchViewNodes, createViewNode, updateViewNodePosition }
})