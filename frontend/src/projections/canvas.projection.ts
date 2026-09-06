import { computed } from "vue";
import { useResourceService, type Resource } from "../services/resources/resource.service";
import { useViewStore, type View, type ViewNode } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import type { CanvasNode } from "./types/canvasNode";
import type { CanvasEdge } from "./types/canvasEdge";
import { useServerStore, type Server } from "../stores/resources/server.store";
import { useUIStore } from "../stores/canvas/ui.store";
import { getVisibleResourceTypes, isResourceTypeExpanded, isResourceTypeVisible, type LevelOfDetail } from "../types/levelOfDetail";
import type { Application } from "../stores/resources/application.store";
import type { Database } from "../stores/resources/database.store";
import type { Table } from "../stores/resources/table.store";
import type { InformationField } from "../types/informationField.type";


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
        const parent = getResourceParent(resource);

        const hasVisibleParent = parent && isResourceTypeVisible(UIStore.levelOfDetail, parent.entityType)
        const position = hasVisibleParent ? calculateChildPosition(parent, viewNode) : viewNode.position

        let resolvedViewNode = undefined;
        if(resource.type === 'application') {
            resolvedViewNode = resolveApplicationNode(resource);
        }
        else if (resource.type === 'database'){
            resolvedViewNode = resolveDatabaseNode(resource);
        }
        else if (resource.type === 'server') {
            resolvedViewNode = resolveServerNode(resource);
        }
        else if (resource.type === 'table') {
            resolvedViewNode = resolveTableNode(resource);
        }
        if(!resolvedViewNode) { return }
        const node: CanvasNode = {
            ...resolvedViewNode,
            id: viewNode.id,
            position: position,
            parentNode: hasVisibleParent ? parent.id : undefined,
            parentPosition: parent?.position,
            extent: parent ? 'parent' : undefined,
            class: resource.type
        }
        return node;
    }

    function getResourceParent(resource: Resource): ViewNode | undefined {
        
        switch (resource.type) {
            case 'database':
                const serverId = getDatabaseServer(resource);
                if(!serverId) { return undefined; }
                return entityIdToNodeMap.value.get(serverId);
            case 'table':
                return entityIdToNodeMap.value.get(resource.databaseId);
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

    function calculateChildPosition(parent: ViewNode, child: ViewNode) {
        return {
            x: child.position.x - parent.position.x,
            y: child.position.y - parent.position.y
        }
    }

    function resolveApplicationNode(application: Application) {
        let label = application.name;
        if(application.version){
            label += ' (' + application.version + ')'
        }

        let style = undefined;
        let inputInformationFields: InformationField[] | undefined = undefined;
        let outputInformationFields: InformationField[] | undefined = undefined;
        if(isResourceTypeExpanded(UIStore.levelOfDetail, 'application')){
            style = {
                width: '150px',
                height: '100px'                
            }
            inputInformationFields = application.inputInformationFields;
            outputInformationFields = application.outputInformationFields;
        }

        return {
            type: 'application',
            style,
            data:{
                label,
                inputInformationFields,
                outputInformationFields,
                resourceId: application.id
            }
        }
    }

    function resolveDatabaseNode(database: Database) {
        let label = database.name;
        if(database.engine){
            label += ' (' + database.engine + ')'
        }

        return {
            type: 'default',
            style: {
                width: '200px',
                height: '150px'
            },
            data: {
                label,
                resourceId: database.id
            }
        }
    }

    function resolveTableNode(table: Table) {

        return {
            type: 'table',
            style: {
                width: '50px',
                height: '100px',
                'font-size': '6px',
                'line-height': '2px'
            },
            data: {
                label: table.name,
                resourceId: table.id
            }
        }
    }

    function resolveServerNode(server: Server) {
        return {
            type: 'default',
            style: {
                width: '600px',
                height: '300px'
            },
            data: {
                label: server.name,
                resourceId: server.id
            }
        }
    }

    return {
        flowNodes,
        flowEdges
    };
}