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
import type { FileLocation } from "../stores/resources/fileLocation.store";
import { useUIStore } from "../stores/canvas/ui.store";
import { getVisibleResourceTypes, isResourceEndpointsVisible, isResourceTypeExpanded, isResourceTypeVisible, type LevelOfDetail } from "../types/levelOfDetail";
import { useEndpointStore, getEndpointTypeInfo, type Endpoint } from "../stores/endpoint.store";
import { useEndpointInformationService } from "../services/endpointInformation.service";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useDatabaseStore, type Database } from "../stores/resources/database.store";
import { useTableStore, type Table } from "../stores/resources/table.store";
import { useApplicationStore } from "../stores/resources/application.store";
import { useOtherConnectionStore } from "../stores/otherConnection.store";
import { useInformationTransferService } from "../services/informationTransfer.service";
import type { ResolvedInformationFieldReference } from "../types/informationField.type";
import type { ResolvedInformationObjectReference } from "../types/informationObject.type";
import { useResourceResolver } from "../resolvers/resource.resolver";
import type { ApplicationNode, ResolvedApplication } from "../types/application.types";
import type { ResolvedExternal } from "../types/external.types";
import { useComponentStore } from "../stores/resources/component.store";
import { getComponentHandleId, getComponentIcon, getInformationSlotIds, type CanvasComponentInformation, type CanvasComponentLink, type CanvasComponentRow, type Component, type ComponentEnd, type InformationSlot } from "../types/component.types";



// The default width of the resource nodes at the application level of detail. For now the database level of detail
// starts from the same width; a node can become wider when its content needs more room, for example a database
// with several tables
const DEFAULT_NODE_WIDTH_APPLICATION_LOD = 220;

// Sizes in px. The table sizes have to match the styling in TableNode.vue
const TABLE_LAYOUT = {
    tableWidth: 110,
    tableHeaderHeight: 20,
    tableRowHeight: 13,
    tablePaddingBottom: 3,
    gap: 8,
    databasePadding: 10,
    databaseHeaderHeight: 38,
    emptyDatabaseWidth: DEFAULT_NODE_WIDTH_APPLICATION_LOD,
    emptyDatabaseHeight: 70
};

interface DatabaseLayout {
    tablePositions: Map<string, { x: number, y: number }>;
    width: number;
    height: number;
}


// Where an edge starts or ends: a node, and for a component the handle of its row inside that node
interface CanvasAnchor {
    nodeId: string;
    handleId?: string;
}

// At the application level of detail the resource nodes only show their name, all as cards of the same size
const OVERVIEW_NODE_STYLE = {
    width: `${DEFAULT_NODE_WIDTH_APPLICATION_LOD}px`,
    height: '60px'
};

export function useCanvasProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();
    
    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();
    const serverStore = useServerStore();
    const databaseStore = useDatabaseStore();
    const tableStore = useTableStore();
    const applicationStore = useApplicationStore();
    const componentStore = useComponentStore();
    const endpointStore = useEndpointStore();
    const endpointInformationService = useEndpointInformationService();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const otherConnectionStore = useOtherConnectionStore();
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
            source: CanvasAnchor,
            target: CanvasAnchor,
            sourceResourceId: string,
            targetResourceId: string
        ): CanvasEdge {
            return {
                id,
                type: 'connection',
                source: source.nodeId,
                target: target.nodeId,
                sourceHandle: source.handleId,
                targetHandle: target.handleId,
                data: {
                    apiIds: [],
                    databaseConnectionIds: [],
                    scriptIds: [],
                    otherConnectionIds: [],
                    componentScriptIds: [],
                    otherConnectionMethods: [],
                    sourceResourceId,
                    targetResourceId,
                    warnings: [],
                    hasError: false
                },
                zIndex: 10,
            };
        }

        function getOrCreateEdge(sourceResourceId: string, targetResourceId: string): CanvasEdge | undefined {
            const sourceViewNodeId = entityIdToNodeMap.value.get(sourceResourceId)?.id;
            const targetViewNodeId = entityIdToNodeMap.value.get(targetResourceId)?.id;
            const source = getAnchor(sourceResourceId, 'out');
            const target = getAnchor(targetResourceId, 'in');

            if (!sourceViewNodeId || !targetViewNodeId || !source || !target) return;
            // A script that reads from or writes to its own resource (or a file next to it) stays inside the node:
            // it is listed in the opened row instead of drawn as a loop
            if (source.nodeId === target.nodeId) return;

            // The id is made of the view nodes of what is connected (for a component its own view node, even though
            // the edge is drawn to the node of its resource), so selecting the edge finds both ends again
            const edgeId = `${sourceViewNodeId}-${targetViewNodeId}`;

            let edge = edges.get(edgeId);

            if (!edge) {
                edge = createEdge(edgeId, source, target, sourceResourceId, targetResourceId);
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
            'apiIds' | 'databaseConnectionIds' | 'scriptIds' | 'otherConnectionIds' | 'componentScriptIds'
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

        for(const otherConnection of otherConnectionStore.otherConnections){
            if(!otherConnection.sourceId || !otherConnection.targetId) continue;
            addConnection(
                otherConnection.sourceId,
                otherConnection.targetId,
                otherConnection.id,
                'otherConnectionIds'
            );
            getOrCreateEdge(otherConnection.sourceId, otherConnection.targetId)?.data.otherConnectionMethods.push(otherConnection.method);
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

        // The edge points in the direction the data flows: reading goes from the database to the resource,
        // writing goes from the resource to the database. A connection that does both gets an edge in each direction
        for(const dbConnection of databaseConnectionStore.databaseConnections){
            const writes = dbConnection.operation.includes('write');
            const reads = dbConnection.operation.includes('read') || !writes;

            if(reads) {
                addConnection(dbConnection.databaseId, dbConnection.entityId, dbConnection.id, 'databaseConnectionIds');
            }
            if(writes) {
                addConnection(dbConnection.entityId, dbConnection.databaseId, dbConnection.id, 'databaseConnectionIds');
            }
        }

        for(const script of scriptStore.scripts){
            script.inputIds.map((inputId) => {
                script.outputIds.map((outputId) => {
                    addConnection(inputId, outputId, script.id, 'scriptIds');
                })
            })
        }

        // Script components. From the database level on a component is a row inside its resource with handles of its
        // own: a script gets an edge from everything it reads and to everything it writes (input -> script -> output).
        // At the application level the rows are hidden, so the edges go to and from the resource the script runs in:
        // the script depends on its resource (input -> resource -> output)
        const componentsVisible = isResourceTypeVisible(UIStore.levelOfDetail, 'component');
        for(const component of componentStore.components) {
            if(component.kind !== 'script') continue;

            const scriptEndId = componentsVisible ? component.id : component.resourceId;
            for(const input of getDrawnEnds(component.inputs)) {
                addConnection(getVisibleEndId(input), scriptEndId, component.id, 'componentScriptIds');
            }
            for(const output of getDrawnEnds(component.outputs)) {
                addConnection(scriptEndId, getVisibleEndId(output), component.id, 'componentScriptIds');
            }
        }

        // The same warnings are shown in the connection details when the edge is selected
        for(const edge of edges.values()) {
            const warnings = informationTransferService.getConnectionWarnings(edge.data.sourceResourceId, edge.data.targetResourceId);
            edge.data.warnings = warnings.map((warning) => warning.title);
            edge.data.hasError = warnings.some((warning) => warning.severity === 'error');
        }

        const visibleViewNodeIds = new Set(flowNodes.value.map((node) => node.id));

        // The arrow head gets the same color as the edge line in ConnectionEdge.vue
        return Array.from(edges.values())
            .filter((edge) => visibleViewNodeIds.has(edge.source) && visibleViewNodeIds.has(edge.target))
            .map((edge) => ({
            ...edge,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edge.data.hasError ? '#ef4444' : edge.data.warnings.length ? '#f59e0b' : '#94a3b8',
                width: 14,
                height: 14
            }
        }));
    });

    function getVisibleNodes(levelOfDetail: LevelOfDetail, viewNodes: ViewNode[]): ViewNode[]{
        const visibleResourceTypes = getVisibleResourceTypes(levelOfDetail);
        // Components are rows inside the node of their resource, not nodes of their own
        const visibleNodes = viewNodes.filter((viewNode) =>
            viewNode.entityType !== 'component' && visibleResourceTypes.includes(viewNode.entityType)
        );
        return visibleNodes;
    }

    // The ends of a script that get an edge. A database or file location only gets its own edge while no table or file
    // of it is known; otherwise the edges go to those (when collapsed they end up at the database or file location anyway)
    function getDrawnEnds(ends: ComponentEnd[]): ComponentEnd[] {
        const parentIds = new Set(ends.flatMap((end) => {
            if(end.componentId) return [end.resourceId];
            const resource = resourceService.getResource(end.resourceId);
            return resource?.type === 'table' ? [resource.databaseId] : [];
        }));
        return ends.filter((end) => end.componentId || !parentIds.has(end.resourceId));
    }

    // Where an end of a script is shown on the canvas: a file in a file location when components are visible,
    // otherwise its file location. A table when tables are visible, otherwise its database
    function getVisibleEndId(end: ComponentEnd): string {
        if(end.componentId && isResourceTypeVisible(UIStore.levelOfDetail, 'component')) {
            return end.componentId;
        }
        const resource = resourceService.getResource(end.resourceId);
        if(resource?.type === 'table' && !isResourceTypeVisible(UIStore.levelOfDetail, 'table')) {
            return resource.databaseId;
        }
        return end.resourceId;
    }

    // Where an end of an edge is drawn: the node of a resource, or for a component the row inside the node of its
    // resource, with the handle on the side the edge comes in or goes out
    function getAnchor(entityId: string, side: 'in' | 'out'): CanvasAnchor | undefined {
        const component = componentStore.getComponent(entityId);
        if(component) {
            const hostViewNodeId = entityIdToNodeMap.value.get(component.resourceId)?.id;
            return hostViewNodeId ? { nodeId: hostViewNodeId, handleId: getComponentHandleId(component.id, side) } : undefined;
        }
        const viewNodeId = entityIdToNodeMap.value.get(entityId)?.id;
        return viewNodeId ? { nodeId: viewNodeId } : undefined;
    }

    const RESOURCE_ICONS: Record<string, string> = {
        application: 'pi pi-desktop',
        database: 'pi pi-database',
        table: 'pi pi-table',
        fileLocation: 'pi pi-folder',
        external: 'pi pi-globe',
        server: 'pi pi-server'
    };

    // What a script reads from or writes to, as a line in its opened row
    function getEndLink(end: ComponentEnd): CanvasComponentLink {
        const resource = resourceService.getResource(end.resourceId);
        if(end.componentId) {
            const component = componentStore.getComponent(end.componentId);
            return {
                key: `component:${end.componentId}`,
                name: `${component?.name ?? 'Unknown'}${resource ? ` (${resource.name})` : ''}`,
                icon: component ? getComponentIcon(component) : 'pi pi-file'
            };
        }
        const databaseName = resource?.type === 'table' ? resourceService.getResource(resource.databaseId)?.name : undefined;
        return {
            key: `resource:${end.resourceId}`,
            name: `${databaseName ? `${databaseName}.` : ''}${resource?.name ?? 'Unknown'}`,
            icon: RESOURCE_ICONS[resource?.type ?? ''] ?? 'pi pi-box'
        };
    }

    function getScriptLink(script: Component): CanvasComponentLink {
        const host = resourceService.getResource(script.resourceId);
        return {
            key: `component:${script.id}`,
            name: `${script.name}${host ? ` (${host.name})` : ''}`,
            icon: getComponentIcon(script)
        };
    }

    // The information in one slot of a component (the inputs or outputs of a script), with the fields of each object
    function getRowInformation(component: Component, slot: InformationSlot): CanvasComponentInformation {
        const { informationFieldIds, informationObjectIds } = getInformationSlotIds(component, slot);
        return {
            objects: informationObjectIds
                .map((objectId) => informationObjectStore.getInformationObject(objectId))
                .filter((informationObject) => informationObject !== undefined)
                .map((informationObject) => ({
                    id: informationObject.id,
                    name: informationObject.objectName,
                    fieldNames: informationObject.informationFieldIds
                        .map((fieldId) => informationFieldStore.getInformationField(fieldId)?.fieldName)
                        .filter((name) => name !== undefined)
                })),
            fieldNames: informationFieldIds
                .map((fieldId) => informationFieldStore.getInformationField(fieldId)?.fieldName)
                .filter((name) => name !== undefined)
        };
    }

    // The components of a resource as rows inside its node; only from the level of detail where components are shown
    function projectComponentRows(resourceId: string): CanvasComponentRow[] | undefined {
        if(!isResourceTypeVisible(UIStore.levelOfDetail, 'component')) return;

        return componentStore.getResourceComponents(resourceId)
            .slice()
            .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
            .map((component) => {
                // A file is written by the scripts that have it as output, and read by the scripts that have it as input
                const writers = componentStore.components.filter((script) =>
                    script.kind === 'script' && script.outputs.some((end) => end.componentId === component.id));
                const readers = componentStore.components.filter((script) =>
                    script.kind === 'script' && script.inputs.some((end) => end.componentId === component.id));

                return {
                    id: component.id,
                    viewNodeId: entityIdToNodeMap.value.get(component.id)?.id,
                    kind: component.kind,
                    name: component.name,
                    icon: getComponentIcon(component),
                    searchMatch: componentMatchesSearch(component),
                    inputs: component.kind === 'script' ? getRowInformation(component, 'input') : undefined,
                    outputs: component.kind === 'script' ? getRowInformation(component, 'output') : undefined,
                    incoming: component.kind === 'script' ? component.inputs.map(getEndLink) : writers.map(getScriptLink),
                    outgoing: component.kind === 'script' ? component.outputs.map(getEndLink) : readers.map(getScriptLink),
                    objectNames: component.informationObjectIds
                        .map((objectId) => informationObjectStore.getInformationObject(objectId)?.objectName)
                        .filter((name) => name !== undefined),
                    fieldNames: component.informationFieldIds
                        .map((fieldId) => informationFieldStore.getInformationField(fieldId)?.fieldName)
                        .filter((name) => name !== undefined)
                };
            });
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
        else if (resolvedResoure.type === 'external') {
            projectedViewNode = projectExternalNode(resolvedResoure);
        }
        else if (resource.type === 'fileLocation') {
            projectedViewNode = resolveFileLocationNode(resource);
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

    // Whether the names match the searched InformationField and/or InformationObject; undefined when nothing is searched
    function matchesSearch(fieldNames: string[], objectNames: string[]): boolean | undefined {
        const fieldSearch = UIStore.informationFieldSearch.trim().toLowerCase();
        const objectSearch = UIStore.informationObjectSearch.trim().toLowerCase();
        if(!fieldSearch && !objectSearch) { return undefined; }

        const matchesField = !fieldSearch || fieldNames.some((name) => name.toLowerCase().includes(fieldSearch));
        const matchesObject = !objectSearch || objectNames.some((name) => name.toLowerCase().includes(objectSearch));
        return matchesField && matchesObject;
    }

    // A component matches on everything it holds: the inputs and outputs of a script, the contents of a file
    function componentMatchesSearch(component: Component): boolean | undefined {
        const slots: InformationSlot[] = component.kind === 'script' ? ['input', 'output'] : ['contains'];
        const information = slots.map((slot) => getRowInformation(component, slot));
        return matchesSearch(
            information.flatMap((slot) => [...slot.fieldNames, ...slot.objects.flatMap((informationObject) => informationObject.fieldNames)]),
            information.flatMap((slot) => slot.objects.map((informationObject) => informationObject.name))
        );
    }

    // Nodes that contain the searched InformationField and/or InformationObject are highlighted, all others are dimmed.
    // A resource also matches when one of its components (a script, a file) uses the searched information
    function getSearchClass(resource: ResolvedResource): string {
        if(matchesSearch([], []) === undefined) { return ''; }

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
        else if(resource.type === 'external') {
            const informationObjects = [
                ...resource.providedInformationObjects,
                ...resource.receivedInformationObjects
            ].map((reference) => reference.informationObject);

            objectNames = informationObjects.map((informationObject) => informationObject.objectName);
            fieldNames = [
                ...resource.providedInformationFields.map((reference) => reference.informationField.fieldName),
                ...resource.receivedInformationFields.map((reference) => reference.informationField.fieldName),
                ...informationObjects.flatMap((informationObject) => informationObject.informationFields.map((field) => field.fieldName))
            ];
        }

        const componentMatches = componentStore.getResourceComponents(resource.id)
            .some((component) => componentMatchesSearch(component));

        return matchesSearch(fieldNames, objectNames) || componentMatches ? ' search-match' : ' search-dimmed';
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

    function getMissingEndpointNames(endpoint: Endpoint) {
        const missing = endpointInformationService.getMissingInformation(endpoint);
        return {
            missingObjectNames: missing.objects.map((informationObject) => informationObject.objectName),
            missingFieldNames: missing.fields.map((field) => field.fieldName)
        };
    }

    function projectApplicationNode(application: ResolvedApplication) {
        let label = application.name;
        if(application.version){
            label += ' (' + application.version + ')'
        }

        // At the application level the node only shows its name, as a bigger card
        let style: Record<string, string> = { ...OVERVIEW_NODE_STYLE };
        let inputInformationFields: ResolvedInformationFieldReference[] | undefined = undefined;
        let outputInformationFields: ResolvedInformationFieldReference[] | undefined = undefined;
        let inputInformationObjects: ResolvedInformationObjectReference[] | undefined = undefined;
        let outputInformationObjects: ResolvedInformationObjectReference[] | undefined = undefined;
        if(isResourceTypeExpanded(UIStore.levelOfDetail, 'application')){
            style = {
                width: `${DEFAULT_NODE_WIDTH_APPLICATION_LOD}px`,
                // minHeight instead of height, so the node grows with its information fields and objects
                minHeight: '100px'
            }
            inputInformationFields = application.inputInformationFields;
            outputInformationFields = application.outputInformationFields;
            inputInformationObjects = application.inputInformationObjects;
            outputInformationObjects = application.outputInformationObjects;
        }

        // At the detail level the node also lists the endpoints of the application
        const endpoints = isResourceEndpointsVisible(UIStore.levelOfDetail, 'application')
            ? endpointStore.getResourceEndpoints(application.id).map((endpoint) => ({
                id: endpoint.id,
                name: endpoint.name,
                icon: getEndpointTypeInfo(endpoint.type).icon,
                objectNames: endpoint.informationObjectIds
                    .map((objectId) => informationObjectStore.getInformationObject(objectId)?.objectName)
                    .filter((name) => name !== undefined),
                fieldNames: endpoint.informationFieldIds
                    .map((fieldId) => informationFieldStore.getInformationField(fieldId)?.fieldName)
                    .filter((name) => name !== undefined),
                ...getMissingEndpointNames(endpoint)
            }))
            : undefined;

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
                endpoints,
                components: projectComponentRows(application.id)
            }
        }
    }

    function resolveDatabaseNode(database: Database) {
        const tableCount = tableStore.tables.filter((table) => table.databaseId === database.id).length;
        const showTables = isResourceTypeVisible(UIStore.levelOfDetail, 'table');
        const layout = databaseLayouts.value.get(database.id);

        return {
            type: 'database',
            // The database has the same size at every level of detail, so it stays in place while zooming.
            // At the application level it only shows its name, from the database level on also its tables
            style: {
                width: `${layout?.width ?? TABLE_LAYOUT.emptyDatabaseWidth}px`,
                height: `${layout?.height ?? TABLE_LAYOUT.emptyDatabaseHeight}px`
            },
            data: {
                label: database.name,
                engine: database.engine,
                tableCount,
                canAddTables: showTables,
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

    // An external element is a black box. At the application level only its name is shown,
    // at lower levels also which information it provides and receives
    function projectExternalNode(external: ResolvedExternal) {
        const expanded = isResourceTypeExpanded(UIStore.levelOfDetail, 'external');

        return {
            type: 'external',
            style: expanded ? { width: `${DEFAULT_NODE_WIDTH_APPLICATION_LOD}px` } : { ...OVERVIEW_NODE_STYLE },
            data: {
                label: external.name,
                resourceId: external.id,
                kind: external.kind,
                externalOrganisation: external.externalOrganisation,
                expanded,
                providedInformationFields: external.providedInformationFields,
                providedInformationObjects: external.providedInformationObjects,
                receivedInformationFields: external.receivedInformationFields,
                receivedInformationObjects: external.receivedInformationObjects
            }
        }
    }

    function resolveFileLocationNode(fileLocation: FileLocation) {
        return {
            type: 'fileLocation',
            style: UIStore.levelOfDetail === 'application' ? { ...OVERVIEW_NODE_STYLE } : { width: `${DEFAULT_NODE_WIDTH_APPLICATION_LOD}px` },
            data: {
                label: fileLocation.name,
                resourceId: fileLocation.id,
                // At the database level the node has a banner like the application node
                expanded: UIStore.levelOfDetail !== 'application',
                components: projectComponentRows(fileLocation.id)
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