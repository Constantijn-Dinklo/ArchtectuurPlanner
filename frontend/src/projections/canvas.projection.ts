import { computed } from "vue";
import { useResourceService, type Resource } from "../services/resources/resource.service";
import { useViewStore, type ViewNode } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import type { CanvasNode } from "./types/canvasNode";
import type { CanvasEdge } from "./types/canvasEdge";
import { useServerStore } from "../stores/resources/server.store";
import { useUIStore } from "../stores/canvas/ui.store";
import { getVisibleResourceTypes, type LevelOfDetail } from "../types/levelOfDetail";


export function useCanvasProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();
    const resourceService = useResourceService();
    const serverStore = useServerStore();

    const apiConnectionStore = useApiConnectionStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const scriptStore = useScriptStore();

    const entityIdToNodeMap = computed(() => {
        const map = new Map<string, ViewNode>();
        for(const node of viewStore.viewNodes){
            map.set(node.entityId, node);
        }
        return map;
    });

    const flowNodes = computed(() => {
        const visibleNodes = getVisibleNodes(UIStore.levelOfDetail, viewStore.viewNodes);
        const viewNodes = visibleNodes.map((viewNode) => resolveViewNode(viewNode)).filter(node => node !== undefined);
        return viewNodes;
    });

    const flowEdges = computed(() => {
        const edges: Map<string, CanvasEdge> = new Map<string, CanvasEdge>();

        function createEdge(
            id: string,
            source: string,
            target: string
        ): CanvasEdge {
            return {
                id,
                source,
                target,
                data: {
                    apiIds: [],
                    databaseConnectionIds: [],
                    scriptIds: [],
                },
                label: '',
                zIndex: 10,
            };
        }

        function createlabel(edge: CanvasEdge){
            let apiLabel = ''
            if(edge.data.apiIds.length > 0){
                apiLabel = edge.data.apiIds.length + " API's"
            }

            let dbLabel = ''
            if(edge.data.databaseConnectionIds.length > 0){
                dbLabel = edge.data.databaseConnectionIds.length + " DB's"
            }

            let scriptLabel = ''
            if(edge.data.scriptIds.length > 0){
                scriptLabel = edge.data.scriptIds.length + " scripts"
            }

            return apiLabel + dbLabel + scriptLabel
        }

        function addConnection(
            sourceResourceId: string,
            targetResourceId: string,
            connectionId: string,
            field: keyof Pick<
            CanvasEdge["data"],
            'apiIds' | 'databaseConnectionIds' | 'scriptIds'
            >
        ) {
            const sourceViewNodeId = entityIdToNodeMap.value.get(sourceResourceId)?.id;
            const targetViewNodeId = entityIdToNodeMap.value.get(targetResourceId)?.id;

            if (!sourceViewNodeId || !targetViewNodeId) return;

            const edgeId = `${sourceViewNodeId}-${targetViewNodeId}`;

            let edge = edges.get(edgeId);

            if (!edge) {
                edge = createEdge(edgeId, sourceViewNodeId, targetViewNodeId);
                edges.set(edgeId, edge);
            }

            edge.data[field].push(connectionId);
            edge.label = createlabel(edge);
        }
        
        for(const apiConnection of apiConnectionStore.apiConnections){
            addConnection(
                apiConnection.sourceId,
                apiConnection.targetId,
                apiConnection.id,
                'apiIds'
            );
        }

        for(const dbConnection of databaseConnectionStore.databaseConnections){
            addConnection(
                dbConnection.databaseId,
                dbConnection.entityId,
                dbConnection.id,
                'databaseConnectionIds'
            );
        }

        for(const script of scriptStore.scripts){
            script.inputIds.map((inputId) => {
                script.outputIds.map((outputId) => {
                    addConnection(inputId, outputId, script.id, 'scriptIds');
                })
            })
        }

        return Array.from(edges.values());
    });

    function getVisibleNodes(levelOfDetail: LevelOfDetail, viewNodes: ViewNode[]): ViewNode[]{
        const visibleResourceTypes = getVisibleResourceTypes(levelOfDetail);
        const visibleNodes = viewNodes.filter((viewNode) => visibleResourceTypes.includes(viewNode.entityType));
        return visibleNodes;
    }

    function resolveViewNode(viewNode: ViewNode): CanvasNode | undefined {
        const resource = resourceService.getResource(viewNode.entityId);
        if(!resource) { return; }
        const label = getResourceLabel(resource);
        const style = getResourceStyle(resource);
        const parent = getResourceParent(resource);

        const node: CanvasNode = {
            id: viewNode.id,
            position: viewNode.position,
            style: style,
            parentNode: parent,
            extent: parent ? 'parent' : undefined,
            data: {
                label: label,
                type: resource.type
            },
            class: resource.type
        }
        return node;
    }

    function getResourceLabel(resource: Resource): string {
        let label = resource.name;

        switch (resource.type) {
            case 'application':
                if(resource.version){
                    label += ' (' + resource.version + ')'
                }
                break;
            case 'database':
                if(resource.engine){
                    label += ' (' + resource.engine + ')'
                }
                break;
        }

        return label;
    }

    function getResourceStyle(resource: Resource): any {
        
        switch (resource.type) {
            case 'server':
                return {
                    width: '300px',
                    height: '200px'
            }
            case 'table':
                return {
                    width: '100px',
                    height: '10px'
                }
        }
        return undefined;
    }

    function getResourceParent(resource: Resource): string | undefined {
        
        switch (resource.type) {
            case 'database':
                const serverId = getDatabaseServer(resource);
                if(!serverId) { return undefined; }
                return entityIdToNodeMap.value.get(serverId)?.id;
            case 'table':
                return entityIdToNodeMap.value.get(resource.databaseId)?.id;
        }
        
        return undefined;
    }

    function getDatabaseServer(resource: Resource): string | undefined {
        if(resource.type !== 'database') return;
        
        for(const server of serverStore.servers){
            if(server.entityIds.includes(resource.id)){
                return server.id
            }
        }
    }

    return {
        flowNodes,
        flowEdges
    };
}