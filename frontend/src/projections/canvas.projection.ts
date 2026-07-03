import { computed } from "vue";
import { useResourceService } from "../services/resource.service";
import { useViewStore, type ViewNode } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import type { CanvasNode } from "./types/canvasNode";
import type { CanvasEdge } from "./types/canvasEdge";
import { useServerService } from "../services/server.service";
import type { Server } from "../stores/server.store";


export function useCanvasProjection() {
    const viewStore = useViewStore();
    const { getResource } = useResourceService();
    const { getServer } = useServerService();

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

        const serverViewNodes = getServerViewNodes(viewStore.viewNodes);
        const serverCanvasNodes = getServerCanvasNodes(serverViewNodes);

        const serverNodeIds = new Set(
            serverCanvasNodes.map(node => node.id)
        );

        const remainingNodes = viewStore.viewNodes.filter(
            node => !serverNodeIds.has(node.id)
        );

        const viewNodes = remainingNodes.map(viewNode => {
            if(viewNode.entityType === 'server') { return; }

            const resource = getResource(viewNode.entityId);
            if(!resource){ return; }

            const node: CanvasNode = {
                id: viewNode.id,
                position: viewNode.position,
                data: {
                    label: resource?.name ?? 'Unknown',
                    type: resource?.type ?? 'unknown'
                },
                class: resource?.type
            };
            return node;
        }).filter(node => node !== undefined);
        
        const nodes = [
            ...serverCanvasNodes,
            ...viewNodes
        ];

        return nodes;
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
                label: ''
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
                dbConnection.targetId,
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

    function getServerViewNodes(viewNodes: ViewNode[]): ViewNode[] {
        return viewNodes.filter((viewNode) => {
            return viewNode.entityType === 'server'
        });
    }

    function getServerCanvasNodes(viewNodes: ViewNode[]): CanvasNode[] {
        const serverCanvasNodes: CanvasNode[] = [];

        for(const viewNode of viewNodes){
            const server = getServer(viewNode.entityId);
            const node: CanvasNode = {
                id: viewNode.id,
                position: viewNode.position,
                style: {
                    width: '300px',
                    height: '200px'
                },
                data: {
                    label: server?.name ?? 'Unknown',
                    type: 'server'
                },
                class: 'server'
            }
            serverCanvasNodes.push(node);
            if(server){
                const childNodes = getServerChildNodes(server, node);
                childNodes.forEach((childNode) => serverCanvasNodes.push(childNode));
            }
        }
        return serverCanvasNodes;       
    }

    function getServerChildNodes(server: Server, serverCanvasNode: CanvasNode): CanvasNode[] {
        const childNodes = server.entityIds.map((entityId) => {
            const entity = getResource(entityId);
            const entityNode = entityIdToNodeMap.value.get(entityId);
            if(!entity || !entityNode) return;
            const node: CanvasNode = {
                id: entityNode.id,
                position: entityNode.position,
                parentNode: serverCanvasNode.id,
                extent: 'parent',
                data: {
                    label: entity.name, 
                    type: entityNode.entityType,
                },
                class: entityNode.entityType
            }
            return node;
        }).filter((entityNode) => entityNode !== undefined);
        return childNodes;
    }

    return {
        flowNodes,
        flowEdges
    };
}