import { computed } from "vue";
import { MarkerType } from "@vue-flow/core";
import { useResourceService, type ResolvedResource, type Resource } from "../services/resources/resource.service";
import { useViewStore, type ViewNode } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import type { CanvasNode } from "./types/canvasNode";
import type { CanvasEdge } from "./types/canvasEdge";
import { useServerStore, type Server } from "../stores/resources/server.store";
import { useUIStore } from "../stores/canvas/ui.store";
import { getVisibleResourceTypes, isResourceTypeExpanded, isResourceTypeVisible, type LevelOfDetail } from "../types/levelOfDetail";
import { useDatabaseStore, type Database } from "../stores/resources/database.store";
import { useTableStore, type Table } from "../stores/resources/table.store";
import { useApplicationStore } from "../stores/resources/application.store";
import { useHumanConnectionStore } from "../stores/humanConnection.store";
import { useInformationTransferService } from "../services/informationTransfer.service";
import type { ResolvedInformationFieldReference } from "../types/informationField.type";
import type { ResolvedInformationObjectReference } from "../types/informationObject.type";
import { useResourceResolver } from "../resolvers/resource.resolver";
import type { ApplicationNode, ResolvedApplication } from "../types/application.types";


// Sizes in px. The table sizes have to match the styling in TableNode.vue
const TABLE_LAYOUT = {
    tableWidth: 110,
    tableHeaderHeight: 20,
    tableRowHeight: 13,
    tablePaddingBottom: 3,
    gap: 8,
    databasePadding: 10,
    databaseHeaderHeight: 38,
    emptyDatabaseWidth: 200,
    emptyDatabaseHeight: 70
};

interface DatabaseLayout {
    tablePositions: Map<string, { x: number, y: number }>;
    width: number;
    height: number;
}

export function useCanvasProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();
    
    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();
    const serverStore = useServerStore();
    const databaseStore = useDatabaseStore();
    const tableStore = useTableStore();
    const applicationStore = useApplicationStore();
    const humanConnectionStore = useHumanConnectionStore();
    const informationTransferService = useInformationTransferService();

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
            target: string,
            sourceResourceId: string,
            targetResourceId: string
        ): CanvasEdge {
            return {
                id,
                type: 'connection',
                source,
                target,
                data: {
                    apiIds: [],
                    databaseConnectionIds: [],
                    scriptIds: [],
                    humanConnectionIds: [],
                    sourceResourceId,
                    targetResourceId,
                    warnings: []
                },
                zIndex: 10,
            };
        }

        function getOrCreateEdge(sourceResourceId: string, targetResourceId: string): CanvasEdge | undefined {
            const sourceViewNodeId = entityIdToNodeMap.value.get(sourceResourceId)?.id;
            const targetViewNodeId = entityIdToNodeMap.value.get(targetResourceId)?.id;

            if (!sourceViewNodeId || !targetViewNodeId) return;

            const edgeId = `${sourceViewNodeId}-${targetViewNodeId}`;

            let edge = edges.get(edgeId);

            if (!edge) {
                edge = createEdge(edgeId, sourceViewNodeId, targetViewNodeId, sourceResourceId, targetResourceId);
                edges.set(edgeId, edge);
            }
            return edge;
        }

        function addConnection(
            sourceResourceId: string,
            targetResourceId: string,
            connectionId: string,
            field: keyof Pick<
            CanvasEdge["data"],
            'apiIds' | 'databaseConnectionIds' | 'scriptIds' | 'humanConnectionIds'
            >
        ) {
            getOrCreateEdge(sourceResourceId, targetResourceId)?.data[field].push(connectionId);
        }

        for(const apiConnection of apiConnectionStore.apiConnections){
            addConnection(
                apiConnection.sourceId,
                apiConnection.targetId,
                apiConnection.id,
                'apiIds'
            );

        }

        for(const humanConnection of humanConnectionStore.humanConnections){
            if(!humanConnection.sourceId || !humanConnection.targetId) continue;
            addConnection(
                humanConnection.sourceId,
                humanConnection.targetId,
                humanConnection.id,
                'humanConnectionIds'
            );
        }

        // Information that goes from one application to another without an api url that sends it.
        // When there is no connection between the applications at all, the edge only shows the warning
        const applicationIds = new Set(applicationStore.applications.map((application) => application.id));
        for(const sourceId of applicationIds) {
            for(const targetId of applicationIds) {
                if(sourceId === targetId) continue;
                if(informationTransferService.getTransferWarnings(sourceId, targetId)) {
                    getOrCreateEdge(sourceId, targetId);
                }
            }
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

        // The same warnings are shown in the connection details when the edge is selected
        for(const edge of edges.values()) {
            edge.data.warnings = informationTransferService
                .getConnectionWarnings(edge.data.sourceResourceId, edge.data.targetResourceId)
                .map((warning) => warning.title);
        }

        // The arrow head gets the same color as the edge line in ConnectionEdge.vue
        return Array.from(edges.values()).map((edge) => ({
            ...edge,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edge.data.warnings.length ? '#f59e0b' : '#94a3b8',
                width: 14,
                height: 14
            }
        }));
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
        let position = hasVisibleParent ? calculateChildPosition(parent, viewNode) : viewNode.position

        // Tables are laid out automatically inside their database, so a database can hold many tables
        const tableLayoutPosition = resource.type === 'table' && hasVisibleParent
            ? databaseLayouts.value.get(resource.databaseId)?.tablePositions.get(resource.id)
            : undefined;
        if(tableLayoutPosition) {
            position = tableLayoutPosition;
        }

        const resolvedResoure = resourceResolver.resolveResource(resource);
        let projectedViewNode = undefined;
        if(resolvedResoure.type === 'application') {
            projectedViewNode = projectApplicationNode(resolvedResoure);
        }
        else if (resource.type === 'database'){
            projectedViewNode = resolveDatabaseNode(resource);
        }
        else if (resource.type === 'server') {
            projectedViewNode = resolveServerNode(resource);
        }
        else if (resource.type === 'table') {
            projectedViewNode = resolveTableNode(resource);
        }
        if(!projectedViewNode) { return }
        const node: CanvasNode = {
            ...projectedViewNode,
            id: viewNode.id,
            position: position,
            parentNode: hasVisibleParent ? parent.id : undefined,
            parentPosition: parent?.position,
            extent: parent ? 'parent' : undefined,
            draggable: tableLayoutPosition ? false : undefined,
            class: resource.type + getSearchClass(resolvedResoure)
        }
        return node;
    }

    function getTableHeight(table: Table) {
        const rowCount = Math.max(table.columns.length, 1);
        return TABLE_LAYOUT.tableHeaderHeight + rowCount * TABLE_LAYOUT.tableRowHeight + TABLE_LAYOUT.tablePaddingBottom;
    }

    // Places the tables of every database in a grid that is as square as possible
    const databaseLayouts = computed(() => {
        const layouts = new Map<string, DatabaseLayout>();
        const {
            tableWidth,
            gap,
            databasePadding,
            databaseHeaderHeight,
            emptyDatabaseWidth,
            emptyDatabaseHeight
        } = TABLE_LAYOUT;

        const tablesPerDatabase = new Map<string, Table[]>();
        for(const table of tableStore.tables) {
            const tables = tablesPerDatabase.get(table.databaseId) ?? [];
            tables.push(table);
            tablesPerDatabase.set(table.databaseId, tables);
        }

        for(const [databaseId, tables] of tablesPerDatabase) {
            const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));
            const columnCount = Math.ceil(Math.sqrt(sortedTables.length));
            const tablePositions = new Map<string, { x: number, y: number }>();

            let y = databaseHeaderHeight;
            for(let rowStart = 0; rowStart < sortedTables.length; rowStart += columnCount) {
                const row = sortedTables.slice(rowStart, rowStart + columnCount);
                row.forEach((table, columnIndex) => {
                    tablePositions.set(table.id, {
                        x: databasePadding + columnIndex * (tableWidth + gap),
                        y
                    });
                });
                y += Math.max(...row.map(getTableHeight)) + gap;
            }

            layouts.set(databaseId, {
                tablePositions,
                width: Math.max(emptyDatabaseWidth, 2 * databasePadding + columnCount * tableWidth + (columnCount - 1) * gap),
                height: Math.max(emptyDatabaseHeight, y - gap + databasePadding)
            });
        }

        for(const database of databaseStore.databases) {
            if(layouts.has(database.id)) continue;
            layouts.set(database.id, {
                tablePositions: new Map(),
                width: emptyDatabaseWidth,
                height: emptyDatabaseHeight
            });
        }

        return layouts;
    });

    // Nodes that contain the searched InformationField and/or InformationObject are highlighted, all others are dimmed
    function getSearchClass(resource: ResolvedResource): string {
        const fieldSearch = UIStore.informationFieldSearch.trim().toLowerCase();
        const objectSearch = UIStore.informationObjectSearch.trim().toLowerCase();
        if(!fieldSearch && !objectSearch) { return ''; }

        let fieldNames: string[] = [];
        let objectNames: string[] = [];
        if(resource.type === 'application') {
            const informationObjects = [
                ...resource.inputInformationObjects,
                ...resource.outputInformationObjects
            ].map((reference) => reference.informationObject);

            objectNames = informationObjects.map((informationObject) => informationObject.objectName);
            fieldNames = [
                ...resource.inputInformationFields.map((reference) => reference.informationField.fieldName),
                ...resource.outputInformationFields.map((reference) => reference.informationField.fieldName),
                ...informationObjects.flatMap((informationObject) => informationObject.informationFields.map((field) => field.fieldName))
            ];
        }
        else if(resource.type === 'table') {
            fieldNames = resource.columns.map((column) => column.fieldName);
        }

        const matchesField = !fieldSearch || fieldNames.some((name) => name.toLowerCase().includes(fieldSearch));
        const matchesObject = !objectSearch || objectNames.some((name) => name.toLowerCase().includes(objectSearch));

        return matchesField && matchesObject ? ' search-match' : ' search-dimmed';
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

    function projectApplicationNode(application: ResolvedApplication) {
        let label = application.name;
        if(application.version){
            label += ' (' + application.version + ')'
        }

        let style = undefined;
        let inputInformationFields: ResolvedInformationFieldReference[] | undefined = undefined;
        let outputInformationFields: ResolvedInformationFieldReference[] | undefined = undefined;
        let inputInformationObjects: ResolvedInformationObjectReference[] | undefined = undefined;
        let outputInformationObjects: ResolvedInformationObjectReference[] | undefined = undefined;
        if(isResourceTypeExpanded(UIStore.levelOfDetail, 'application')){
            style = {
                width: '150px',
                // minHeight instead of height, so the node grows with its information fields and objects
                minHeight: '100px'
            }
            inputInformationFields = application.inputInformationFields;
            outputInformationFields = application.outputInformationFields;
            inputInformationObjects = application.inputInformationObjects;
            outputInformationObjects = application.outputInformationObjects;
        }

        return {
            type: 'application',
            style,
            data:{
                label,
                resourceId: application.id,
                inputInformationFields,
                outputInformationFields,
                inputInformationObjects,
                outputInformationObjects,
            }
        }
    }

    function resolveDatabaseNode(database: Database) {
        const tableCount = tableStore.tables.filter((table) => table.databaseId === database.id).length;
        const showTables = isResourceTypeVisible(UIStore.levelOfDetail, 'table');
        const layout = databaseLayouts.value.get(database.id);

        return {
            type: 'database',
            style: showTables && layout
                ? {
                    width: `${layout.width}px`,
                    height: `${layout.height}px`
                }
                : {
                    width: '200px'
                },
            data: {
                label: database.name,
                engine: database.engine,
                tableCount,
                resourceId: database.id
            }
        }
    }

    function resolveTableNode(table: Table) {
        return {
            type: 'table',
            style: {
                width: `${TABLE_LAYOUT.tableWidth}px`,
                height: `${getTableHeight(table)}px`
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