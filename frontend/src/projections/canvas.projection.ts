import { computed } from "vue";
import { useResourceService } from "../services/resource.service";
import { useViewStore, type ViewNode } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import type { CanvasNode, NodeType } from "./types/canvasNode";
import type { CanvasEdge } from "./types/canvasEdge";
import { useServerService } from "../services/server.service";


export function useCanvasProjection() {
    const viewStore = useViewStore();
    const { getResource } = useResourceService();
    const { getServer } = useServerService();

    const apiConnectionStore = useApiConnectionStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const scriptStore = useScriptStore();

    const flowNodes = computed(() => {
        return viewStore.viewNodes.map(vn => {
            let entity: { name: string; type: string } | undefined;
            if(vn.entityType === 'application' || vn.entityType === 'database' || vn.entityType === 'fileLocation'){
                const resource = getResource(vn.entityId);
                if(resource){
                    entity = {
                        name: resource.name,
                        type: resource.type
                    } 
                }
            }
            else if(vn.entityType === 'server'){
                const server = getServer(vn.entityId);
                if(server) {
                    entity = {
                        name: server.name,
                        type: 'server'
                    }
                }
            }

            entity = {
                name: entity ? entity.name : 'Unknown',
                type: entity ? entity.type : "Unknown"
            }

            const node: CanvasNode = {
                id: vn.id,
                position: vn.position,
                data: {
                    label: entity?.name ?? 'Unknown',
                    type: (entity?.type ?? 'unknown') as NodeType | 'unknown'
                },
                class: entity?.type
            };
            return node;
        });
    });

    const resourceIdToNodeMap = computed(() => {
        const map = new Map<string, ViewNode>();
        for(const node of viewStore.viewNodes){
            map.set(node.entityId, node);
        }
        return map;
    })

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
                apiIds: [],
                databaseConnectionIds: [],
                scriptIds: [],
                label: ''
            };
        }

        function createlabel(edge: CanvasEdge){
            let apiLabel = ''
            if(edge.apiIds.length > 0){
                apiLabel = edge.apiIds.length + " API's"
            }

            let dbLabel = ''
            if(edge.databaseConnectionIds.length > 0){
                dbLabel = edge.databaseConnectionIds.length + " DB's"
            }

            let scriptLabel = ''
            if(edge.scriptIds.length > 0){
                scriptLabel = edge.scriptIds.length + " scripts"
            }

            return apiLabel + dbLabel + scriptLabel
        }

        function addConnection(
            sourceResourceId: string,
            targetResourceId: string,
            connectionId: string,
            field: keyof Pick<
            CanvasEdge,
            'apiIds' | 'databaseConnectionIds' | 'scriptIds'
            >
        ) {
            const sourceId = resourceIdToNodeMap.value.get(sourceResourceId)?.id;
            const targetId = resourceIdToNodeMap.value.get(targetResourceId)?.id;

            if (!sourceId || !targetId) return;

            const edgeId = `${sourceId}-${targetId}`;

            let edge = edges.get(edgeId);

            if (!edge) {
                edge = createEdge(edgeId, sourceId, targetId);
                edges.set(edgeId, edge);
            }

            edge[field].push(connectionId);
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

    return {
        flowNodes,
        flowEdges
    };
}