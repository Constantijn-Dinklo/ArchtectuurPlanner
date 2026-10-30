import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationRelationStore, type ResourceRelation } from "../stores/information/informationRelation.store";
import { useEndpointStore, getEndpointTypeInfo } from "../stores/endpoint.store";
import { useApplicationStore } from "../stores/resources/application.store";
import { useTableStore } from "../stores/resources/table.store";
import { useExternalStore } from "../stores/resources/external.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useResourceService } from "./resources/resource.service";
import { useEndpointInformationService } from "./endpointInformation.service";
import { useInformationEndpointService } from "./informationEndpoint.service";
import { getInformationSlotIds, getScriptCarriedInformation, type Component, type InformationSlot } from "../types/component.types";

// Information is always identified by its id; the name is only used to show it
export type InformationKind = 'field' | 'object';

export interface ChainStep {
    resourceId: string;
    side?: 'input' | 'output';
    // The step is an endpoint (dashboard, map, ...) inside the resource, where the information is used
    endpointId?: string;
    // The step is a script inside the resource that moves the information from one resource to the next
    componentId?: string;
}

// A relation between two steps. carriedByObjectIds is empty when the information travels on its own
export interface ChainEdge {
    source: ChainStep;
    target: ChainStep;
    carriedByObjectIds: string[];
}

export interface ChainStepView extends ChainStep {
    // Names of the InformationObjects the field is part of at this step
    objectNames: string[];
    // The breaks in the chain at this step
    breaks: ChainBreak[];
}

export interface ChainLinkView {
    // Names of the InformationObjects that carry the information to the next step
    objectNames: string[];
}

// One path through the chain, from a start (nothing flows into it) to an end (nothing flows out of it)
export interface Chain {
    steps: ChainStepView[];
    // links[i] connects steps[i] to steps[i + 1]
    links: ChainLinkView[];
}

// How a place holds the information:
// - input / output: an application, or a script (componentId is set), takes it in or produces it
// - column: a column of a table
// - provided / received: an external element provides it, or it is sent to an external element
// - contains: a file in a file location contains it
// - endpoint: an endpoint uses it
export type HolderRole = 'input' | 'output' | 'column' | 'provided' | 'received' | 'contains' | 'endpoint';

export interface ChainHolder {
    resourceId: string;
    componentId?: string;
    endpointId?: string;
    role: HolderRole;
    // Whether the place has the information itself; for a field it can also (or only) be inside objects
    direct: boolean;
    // The objects the field is part of at this place
    objectIds: string[];
}

// - noSource: no source is set (a warning)
// - sourceNotHeld: the source does not hold the information
// - unknownOrigin: an application or script takes the information in, but nothing sends it there (a warning)
// - sourceMissing: a resource sends the information on, but no longer has it
// - endpointMissing: an endpoint uses the information, but it has no way of getting to the resource
// - deadEnd: an application outputs the information, but no other resource or endpoint uses it (as shown on the node)
export type ChainBreakKind = 'noSource' | 'sourceNotHeld' | 'unknownOrigin' | 'sourceMissing' | 'endpointMissing' | 'deadEnd';

export interface ChainBreak {
    kind: ChainBreakKind;
    severity: 'warning' | 'error';
    message: string;
    // The step of the chain where the break is; undefined when it is about the information as a whole
    stepKey?: string;
}

// complete: a source is set and there are no breaks. broken: there is an error.
// noSource: nothing is broken, but no source is set. warning: a source is set, but there are other warnings
export type ChainStatus = 'complete' | 'noSource' | 'warning' | 'broken';

export interface InformationChain {
    kind: InformationKind;
    id: string;
    name: string;
    steps: ChainStep[];
    edges: ChainEdge[];
    chains: Chain[];
    holders: ChainHolder[];
    breaks: ChainBreak[];
    status: ChainStatus;
}

export function stepKey(step: ChainStep) {
    if (step.endpointId) return `endpoint:${step.endpointId}`;
    if (step.componentId) return `component:${step.componentId}`;
    return `${step.resourceId}:${step.side ?? ''}`;
}

// The chain of a piece of information through the architecture: the relations it travels through (with the scripts
// and endpoints on the way), every place that holds it, and the places where the chain is broken
export function useInformationChainService() {
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const informationRelationStore = useInformationRelationStore();
    const endpointStore = useEndpointStore();
    const applicationStore = useApplicationStore();
    const tableStore = useTableStore();
    const externalStore = useExternalStore();
    const componentStore = useComponentStore();
    const resourceService = useResourceService();
    const endpointInformationService = useEndpointInformationService();
    const informationEndpointService = useInformationEndpointService();

    function getChain(kind: InformationKind, id: string): InformationChain | undefined {
        if (kind === 'field') {
            const field = informationFieldStore.getInformationField(id);
            if (!field) return undefined;
            return assemble(kind, id, field.fieldName, field.source?.resourceId ?? null, getContainingObjectIdsOf(id));
        }

        const object = informationObjectStore.getInformationObject(id);
        if (!object) return undefined;
        return assemble(kind, id, object.objectName, object.source?.resourceId ?? null, []);
    }

    function assemble(kind: InformationKind, id: string, name: string, sourceId: string | null, containingObjectIds: string[]): InformationChain {
        const holders = getHolders(kind, id, containingObjectIds);
        const relations = getRelations(kind, id, containingObjectIds);
        const externalEdges = getExternalEdges(holders, relations);
        const edges = [
            ...(kind === 'field' ? getFieldEdges(id, containingObjectIds) : getObjectEdges(id)),
            ...externalEdges
        ];
        const breaks = getBreaks(kind, id, sourceId, containingObjectIds, relations, externalEdges, holders);

        const steps = new Map<string, ChainStep>();
        edges.forEach(edge => {
            steps.set(stepKey(edge.source), edge.source);
            steps.set(stepKey(edge.target), edge.target);
        });

        const chains = buildChains(
            edges,
            step => kind === 'field' ? getStepObjectIds(step, containingObjectIds) : [],
            key => breaks.filter(chainBreak => chainBreak.stepKey === key)
        );

        let status: ChainStatus = 'complete';
        if (breaks.some(chainBreak => chainBreak.severity === 'error')) status = 'broken';
        else if (breaks.some(chainBreak => chainBreak.kind === 'noSource')) status = 'noSource';
        else if (breaks.length) status = 'warning';

        return { kind, id, name, steps: [...steps.values()], edges, chains, holders, breaks, status };
    }

    // ---- Edges ----

    function getContainingObjectIdsOf(informationFieldId: string) {
        return [...informationObjectStore.informationObjects.values()]
            .filter(object => object.informationFieldIds.includes(informationFieldId))
            .map(object => object.id);
    }

    // A field travels on its own through its field relations, and inside an object through the relations of every object it is part of
    function getFieldEdges(informationFieldId: string, containingObjectIds: string[]): ChainEdge[] {
        return [
            ...informationRelationStore.fieldRelations
                .filter(relation => relation.informationFieldId === informationFieldId)
                .flatMap(relation => relationToEdges(relation, script => carriesField(script, informationFieldId))),
            ...informationRelationStore.objectRelations
                .filter(relation => containingObjectIds.includes(relation.informationObjectId))
                .flatMap(relation => relationToEdges(relation, script => carriesObject(script, relation.informationObjectId), relation.informationObjectId)),
            ...getFieldEndpointEdges(informationFieldId, containingObjectIds)
        ];
    }

    function getObjectEdges(informationObjectId: string): ChainEdge[] {
        return [
            ...informationRelationStore.objectRelations
                .filter(relation => relation.informationObjectId === informationObjectId)
                .flatMap(relation => relationToEdges(relation, script => carriesObject(script, informationObjectId))),
            ...getObjectEndpointEdges(informationObjectId)
        ];
    }

    // A script carries what it produces (its outputs), a field also inside an object it produces
    function carriesField(script: Component, informationFieldId: string) {
        const carried = getScriptCarriedInformation(script);
        return carried.informationFieldIds.includes(informationFieldId) ||
            carried.informationObjectIds.some(objectId =>
                informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(informationFieldId)
            );
    }

    function carriesObject(script: Component, informationObjectId: string) {
        return getScriptCarriedInformation(script).informationObjectIds.includes(informationObjectId);
    }

    // Tables are connected through their database
    function getDatabaseId(resourceId: string) {
        const resource = resourceService.getResource(resourceId);
        if (resource?.type === 'table') return resource.databaseId;
        return undefined;
    }

    // The scripts the information goes through on its way from the source to the target of the relation: the script
    // the relation is set to go via, or, when nothing is set, the scripts that read the source, write the target and
    // produce the information
    function getRelationScripts(relation: ResourceRelation, carries: (script: Component) => boolean): Component[] {
        if (relation.sourceResourceId === relation.targetResourceId) return [];

        if (relation.viaConnectionType === 'component' && relation.viaConnectionId) {
            const script = componentStore.getComponent(relation.viaConnectionId);
            return script ? [script] : [];
        }
        if (relation.viaConnectionType) return [];

        const sourceIds = [relation.sourceResourceId, getDatabaseId(relation.sourceResourceId)].filter(id => id !== undefined);
        const targetIds = [relation.targetResourceId, getDatabaseId(relation.targetResourceId)].filter(id => id !== undefined);
        return componentStore.getScriptsBetween(sourceIds, targetIds).filter(carries);
    }

    // A relation that goes through a script gets the script as a step in between: source -> script -> target
    function relationToEdges(relation: ResourceRelation, carries: (script: Component) => boolean, carriedByObjectId?: string): ChainEdge[] {
        const edge = relationToEdge(relation, carriedByObjectId);
        const scripts = getRelationScripts(relation, carries);
        if (!scripts.length) return [edge];

        return scripts.flatMap(script => {
            const scriptStep: ChainStep = { resourceId: script.resourceId, componentId: script.id };
            return [
                { source: edge.source, target: scriptStep, carriedByObjectIds: edge.carriedByObjectIds },
                { source: scriptStep, target: edge.target, carriedByObjectIds: edge.carriedByObjectIds }
            ];
        });
    }

    // A relation inside one application goes from its input to its output.
    // A relation between two resources goes from the output of the source to the input of the target.
    function relationToEdge(relation: ResourceRelation, carriedByObjectId?: string): ChainEdge {
        const isForwarded = relation.sourceResourceId === relation.targetResourceId;

        const source: ChainStep = { resourceId: relation.sourceResourceId };
        if (relation.sourceResourceType === 'application') {
            source.side = isForwarded ? 'input' : 'output';
        }

        const target: ChainStep = { resourceId: relation.targetResourceId };
        if (relation.targetResourceType === 'application') {
            target.side = isForwarded ? 'output' : 'input';
        }

        return {
            source,
            target,
            carriedByObjectIds: carriedByObjectId ? [carriedByObjectId] : []
        };
    }

    interface OutputRefs {
        outputInformationFieldRefs: { informationFieldId: string }[];
        outputInformationObjectRefs: { informationObjectId: string }[];
    }

    // Information that is used in an endpoint gets an extra step from the resource to that endpoint.
    // In an application the step starts at the output when the application outputs the information, otherwise at the input
    function getEndpointSourceStep(resourceId: string, isOutput: (resource: OutputRefs) => boolean): ChainStep {
        const resource = resourceService.getResource(resourceId);
        if (resource?.type !== 'application') return { resourceId };
        return { resourceId, side: isOutput(resource) ? 'output' : 'input' };
    }

    function getFieldEndpointEdges(informationFieldId: string, containingObjectIds: string[]): ChainEdge[] {
        return endpointStore.endpoints.flatMap(endpoint => {
            const usedDirectly = endpoint.informationFieldIds.includes(informationFieldId);
            const usedInObjectIds = endpoint.informationObjectIds.filter(objectId => containingObjectIds.includes(objectId));
            if (!usedDirectly && !usedInObjectIds.length) return [];

            const source = getEndpointSourceStep(endpoint.resourceId, resource =>
                resource.outputInformationFieldRefs.some(ref => ref.informationFieldId === informationFieldId) ||
                resource.outputInformationObjectRefs.some(ref => containingObjectIds.includes(ref.informationObjectId))
            );
            return [{
                source,
                target: { resourceId: endpoint.resourceId, endpointId: endpoint.id },
                carriedByObjectIds: usedDirectly ? [] : usedInObjectIds
            }];
        });
    }

    function getObjectEndpointEdges(informationObjectId: string): ChainEdge[] {
        return endpointStore.endpoints
            .filter(endpoint => endpoint.informationObjectIds.includes(informationObjectId))
            .map(endpoint => ({
                source: getEndpointSourceStep(endpoint.resourceId, resource =>
                    resource.outputInformationObjectRefs.some(ref => ref.informationObjectId === informationObjectId)
                ),
                target: { resourceId: endpoint.resourceId, endpointId: endpoint.id },
                carriedByObjectIds: []
            }));
    }

    // The objects (out of the given ones) that are present on this side of the resource
    function getStepObjectIds(step: ChainStep, objectIds: string[]): string[] {
        const resource = resourceService.getResource(step.resourceId);
        if (resource?.type !== 'application' || !step.side || step.endpointId || step.componentId) return [];

        const objectRefs = step.side === 'input'
            ? resource.inputInformationObjectRefs
            : resource.outputInformationObjectRefs;

        return objectRefs
            .map(objectRef => objectRef.informationObjectId)
            .filter(objectId => objectIds.includes(objectId));
    }

    function getObjectNames(objectIds: string[]) {
        return objectIds.map(objectId => informationObjectStore.getInformationObject(objectId)?.objectName ?? 'Unknown object');
    }

    // Returns every path from a start (nothing flows into it) to an end (nothing flows out of it)
    function buildChains(
        edges: ChainEdge[],
        getStepObjectIdsOf: (step: ChainStep) => string[],
        getStepBreaks: (key: string) => ChainBreak[]
    ): Chain[] {
        const steps = new Map<string, ChainStep>();
        const next = new Map<string, string[]>();
        const hasIncoming = new Set<string>();
        // The same hop can exist on its own and in one or more objects; they are merged into one link
        const linkObjectIds = new Map<string, Set<string>>();

        for (const edge of edges) {
            const sourceKey = stepKey(edge.source);
            const targetKey = stepKey(edge.target);

            steps.set(sourceKey, edge.source);
            steps.set(targetKey, edge.target);
            hasIncoming.add(targetKey);

            const targets = next.get(sourceKey) ?? [];
            if (!targets.includes(targetKey)) targets.push(targetKey);
            next.set(sourceKey, targets);

            const linkKey = `${sourceKey}|${targetKey}`;
            const objectIds = linkObjectIds.get(linkKey) ?? new Set<string>();
            edge.carriedByObjectIds.forEach(objectId => objectIds.add(objectId));
            linkObjectIds.set(linkKey, objectIds);
        }

        const chains: Chain[] = [];
        const visited = new Set<string>();

        function toChain(path: string[]): Chain {
            return {
                steps: path.map(key => {
                    const step = steps.get(key)!;
                    return {
                        ...step,
                        objectNames: getObjectNames(getStepObjectIdsOf(step)),
                        breaks: getStepBreaks(key)
                    };
                }),
                links: path.slice(1).map((key, index) => ({
                    objectNames: getObjectNames([...(linkObjectIds.get(`${path[index]}|${key}`) ?? [])])
                }))
            };
        }

        function walk(key: string, path: string[]) {
            visited.add(key);
            const currentPath = [...path, key];
            // Stop at steps that are already in the path, so a loop does not go on forever
            const targets = (next.get(key) ?? []).filter(target => !currentPath.includes(target));

            if (targets.length === 0) {
                chains.push(toChain(currentPath));
                return;
            }
            for (const target of targets) {
                walk(target, currentPath);
            }
        }

        for (const key of steps.keys()) {
            if (!hasIncoming.has(key)) walk(key, []);
        }
        // Whatever is left over is part of a loop without a start
        for (const key of steps.keys()) {
            if (!visited.has(key)) walk(key, []);
        }

        return chains;
    }

    // ---- Holders ----

    // Whether a place with these fields and objects holds the information; for a field also inside one of its objects
    function toHolder(
        place: Pick<ChainHolder, 'resourceId' | 'componentId' | 'endpointId' | 'role'>,
        kind: InformationKind,
        id: string,
        containingObjectIds: string[],
        fieldIds: string[],
        objectIds: string[]
    ): ChainHolder[] {
        const direct = kind === 'field' ? fieldIds.includes(id) : objectIds.includes(id);
        const viaObjectIds = kind === 'field' ? objectIds.filter(objectId => containingObjectIds.includes(objectId)) : [];
        if (!direct && !viaObjectIds.length) return [];
        return [{ ...place, direct, objectIds: viaObjectIds }];
    }

    // Every place that holds the information: applications, tables, external elements, scripts, files and endpoints
    function getHolders(kind: InformationKind, id: string, containingObjectIds: string[]): ChainHolder[] {
        const holders: ChainHolder[] = [];
        const add = (
            place: Pick<ChainHolder, 'resourceId' | 'componentId' | 'endpointId' | 'role'>,
            fieldIds: string[],
            objectIds: string[]
        ) => holders.push(...toHolder(place, kind, id, containingObjectIds, fieldIds, objectIds));

        for (const application of applicationStore.applications) {
            add(
                { resourceId: application.id, role: 'input' },
                application.inputInformationFieldRefs.map(ref => ref.informationFieldId),
                application.inputInformationObjectRefs.map(ref => ref.informationObjectId)
            );
            add(
                { resourceId: application.id, role: 'output' },
                application.outputInformationFieldRefs.map(ref => ref.informationFieldId),
                application.outputInformationObjectRefs.map(ref => ref.informationObjectId)
            );
        }

        for (const table of tableStore.tables) {
            add({ resourceId: table.id, role: 'column' }, table.columns.map(column => column.id), []);
        }

        for (const external of externalStore.externals) {
            add(
                { resourceId: external.id, role: 'provided' },
                external.providedInformationFieldRefs.map(ref => ref.informationFieldId),
                external.providedInformationObjectRefs.map(ref => ref.informationObjectId)
            );
            add(
                { resourceId: external.id, role: 'received' },
                external.receivedInformationFieldRefs.map(ref => ref.informationFieldId),
                external.receivedInformationObjectRefs.map(ref => ref.informationObjectId)
            );
        }

        for (const component of componentStore.components) {
            const slots: InformationSlot[] = component.kind === 'script' ? ['input', 'output'] : ['contains'];
            for (const slot of slots) {
                const ids = getInformationSlotIds(component, slot);
                add(
                    { resourceId: component.resourceId, componentId: component.id, role: slot },
                    ids.informationFieldIds,
                    ids.informationObjectIds
                );
            }
        }

        for (const endpoint of endpointStore.endpoints) {
            add(
                { resourceId: endpoint.resourceId, endpointId: endpoint.id, role: 'endpoint' },
                endpoint.informationFieldIds,
                endpoint.informationObjectIds
            );
        }

        return holders;
    }

    // Whether the resource has the information to send on: anything but taking it in or using it in an endpoint.
    // A database has what its tables have
    function resourceProvides(holders: ChainHolder[], resourceId: string) {
        return holders.some(holder =>
            (holder.resourceId === resourceId || getDatabaseId(holder.resourceId) === resourceId) &&
            holder.role !== 'input' && holder.role !== 'endpoint'
        );
    }

    // ---- External elements ----

    // External elements are only linked by relations when information is sent to them through a connection.
    // What an external element provides reaches the resources it is connected to without a relation: an edge is
    // added from the external element to every connected resource that takes the information in (an application
    // input, a table, a script reading from it). A script that writes to an external element sends what it produces there.
    function getExternalEdges(holders: ChainHolder[], relations: ResourceRelation[]): ChainEdge[] {
        const edges: ChainEdge[] = [];
        const providers = holders.filter(holder => holder.role === 'provided');
        const isExternal = (resourceId: string) => resourceService.getResource(resourceId)?.type === 'external';

        // The objects that carry a field from the external element to the receiver; none when both have the field itself
        const carriedBy = (provider: ChainHolder, receiver: ChainHolder) =>
            provider.direct && receiver.direct ? [] : provider.objectIds.filter(objectId => receiver.objectIds.includes(objectId));

        for (const receiver of holders) {
            if (receiver.endpointId) continue;

            if (receiver.componentId) {
                if (receiver.role !== 'input') continue;
                const script = componentStore.getComponent(receiver.componentId);
                for (const provider of providers) {
                    if (!script?.inputs.some(end => end.resourceId === provider.resourceId)) continue;
                    edges.push({
                        source: { resourceId: provider.resourceId },
                        target: { resourceId: receiver.resourceId, componentId: receiver.componentId },
                        carriedByObjectIds: carriedBy(provider, receiver)
                    });
                }
                continue;
            }

            if (receiver.role !== 'input' && receiver.role !== 'column') continue;
            const databaseId = getDatabaseId(receiver.resourceId);
            const upstreamIds = new Set([
                ...resourceService.getUpstreamResourceIds(receiver.resourceId),
                ...(databaseId ? resourceService.getUpstreamResourceIds(databaseId) : [])
            ]);
            for (const provider of providers) {
                if (!upstreamIds.has(provider.resourceId)) continue;
                // A relation from the external element already shows how the information gets there
                if (relations.some(relation =>
                    relation.sourceResourceId === provider.resourceId && relation.targetResourceId === receiver.resourceId
                )) continue;
                edges.push({
                    source: { resourceId: provider.resourceId },
                    target: receiver.role === 'input' ? { resourceId: receiver.resourceId, side: 'input' } : { resourceId: receiver.resourceId },
                    carriedByObjectIds: carriedBy(provider, receiver)
                });
            }
        }

        for (const holder of holders) {
            if (!holder.componentId || holder.role !== 'output') continue;
            const script = componentStore.getComponent(holder.componentId);
            for (const end of script?.outputs ?? []) {
                if (!isExternal(end.resourceId)) continue;
                edges.push({
                    source: { resourceId: holder.resourceId, componentId: holder.componentId },
                    target: { resourceId: end.resourceId },
                    carriedByObjectIds: holder.direct ? [] : holder.objectIds
                });
            }
        }

        return edges;
    }

    // ---- Breaks ----

    function getRelations(kind: InformationKind, id: string, containingObjectIds: string[]): ResourceRelation[] {
        return kind === 'field'
            ? [
                ...informationRelationStore.fieldRelations.filter(relation => relation.informationFieldId === id),
                ...informationRelationStore.objectRelations.filter(relation => containingObjectIds.includes(relation.informationObjectId))
            ]
            : informationRelationStore.objectRelations.filter(relation => relation.informationObjectId === id);
    }

    function getBreaks(
        kind: InformationKind,
        id: string,
        sourceId: string | null,
        containingObjectIds: string[],
        relations: ResourceRelation[],
        externalEdges: ChainEdge[],
        holders: ChainHolder[]
    ): ChainBreak[] {
        const breaks: ChainBreak[] = [];
        const noun = kind === 'field' ? 'field' : 'object';

        // The source: set, still in the architecture, and holding the information
        const source = sourceId ? resourceService.getResource(sourceId) : undefined;
        if (!source) {
            breaks.push({ kind: 'noSource', severity: 'warning', message: `No source is set for this ${noun}` });
        }
        else if (!holders.some(holder =>
            (holder.resourceId === source.id || getDatabaseId(holder.resourceId) === source.id) && holder.role !== 'endpoint'
        )) {
            breaks.push({ kind: 'sourceNotHeld', severity: 'error', message: `The source, ${source.name}, does not have this ${noun}` });
        }

        // An application that takes the information in, but nothing sends it there: no relation,
        // and no connected external element that provides it
        for (const holder of holders) {
            if (holder.role !== 'input' || holder.componentId || holder.resourceId === sourceId) continue;
            const receives = relations.some(relation =>
                relation.targetResourceId === holder.resourceId && relation.sourceResourceId !== holder.resourceId
            ) || externalEdges.some(edge => edge.target.resourceId === holder.resourceId && !edge.target.componentId);
            if (!receives) {
                const step: ChainStep = { resourceId: holder.resourceId, side: 'input' };
                breaks.push({
                    kind: 'unknownOrigin',
                    severity: 'warning',
                    message: `${getStepLabel(step)} takes this ${noun} in, but nothing sends it there`,
                    stepKey: stepKey(step)
                });
            }
        }

        // A script that takes the information in, but reads from nothing that has it
        for (const holder of holders) {
            if (holder.role !== 'input' || !holder.componentId) continue;
            const script = componentStore.getComponent(holder.componentId);
            if (!script) continue;
            const fed = script.inputs.some(end => end.componentId
                ? holders.some(other => other.componentId === end.componentId && other.role !== 'input')
                : resourceProvides(holders, end.resourceId)
            );
            if (!fed) {
                const step: ChainStep = { resourceId: holder.resourceId, componentId: holder.componentId };
                breaks.push({
                    kind: 'unknownOrigin',
                    severity: 'warning',
                    message: `${getStepLabel(step)} takes this ${noun} in, but reads from nothing that has it`,
                    stepKey: stepKey(step)
                });
            }
        }

        // A resource that sends the information on, but no longer has it. Within an application the information
        // goes from the input to the output, so there the input has to have it
        const missingAt = new Set<string>();
        for (const relation of relations) {
            const isForwarded = relation.sourceResourceId === relation.targetResourceId;
            const has = isForwarded
                ? holders.some(holder => holder.resourceId === relation.sourceResourceId && !holder.componentId && holder.role === 'input')
                : resourceProvides(holders, relation.sourceResourceId);
            if (has) continue;

            const step = relationToEdge(relation).source;
            const key = stepKey(step);
            if (missingAt.has(key)) continue;
            missingAt.add(key);
            breaks.push({
                kind: 'sourceMissing',
                severity: 'error',
                message: `${getStepLabel(step)} sends this ${noun} on, but no longer has it`,
                stepKey: key
            });
        }

        // An application output that goes nowhere: no relation carries it to another resource and no endpoint uses it.
        // A field that is also (or only) inside output objects goes somewhere when it does on its own or in one of them
        for (const holder of holders) {
            if (holder.role !== 'output' || holder.componentId) continue;
            const isDeadEnd = kind === 'field'
                ? (!holder.direct || informationEndpointService.isUnusedOutputField(holder.resourceId, id)) &&
                    holder.objectIds.every(objectId => informationEndpointService.isUnusedOutputObject(holder.resourceId, objectId))
                : informationEndpointService.isUnusedOutputObject(holder.resourceId, id);
            if (!isDeadEnd) continue;

            const step: ChainStep = { resourceId: holder.resourceId, side: 'output' };
            breaks.push({
                kind: 'deadEnd',
                severity: 'error',
                message: `${getStepLabel(step)} outputs this ${noun}, but no other resource or endpoint uses it`,
                stepKey: stepKey(step)
            });
        }

        // An endpoint that uses the information, but it has no way of getting to its resource
        for (const endpoint of endpointStore.endpoints) {
            const usesFieldDirectly = kind === 'field' && endpoint.informationFieldIds.includes(id);
            const usedObjectIds = kind === 'field'
                ? endpoint.informationObjectIds.filter(objectId => containingObjectIds.includes(objectId))
                : endpoint.informationObjectIds.filter(objectId => objectId === id);
            if (!usesFieldDirectly && !usedObjectIds.length) continue;

            const missing = endpointInformationService.getMissingInformation(endpoint);
            const isMissing = (usesFieldDirectly && missing.fields.some(field => field.id === id)) ||
                missing.objects.some(object => usedObjectIds.includes(object.id));
            if (!isMissing) continue;

            const step: ChainStep = { resourceId: endpoint.resourceId, endpointId: endpoint.id };
            breaks.push({
                kind: 'endpointMissing',
                severity: 'error',
                message: `${getStepLabel(step)} uses this ${noun}, but it has no way of getting there`,
                stepKey: stepKey(step)
            });
        }

        return breaks;
    }

    // ---- Showing steps ----

    function getStepLabel(step: ChainStep) {
        const name = resourceService.getResource(step.resourceId)?.name ?? 'Unknown resource';
        if (step.componentId) {
            return `${componentStore.getComponent(step.componentId)?.name ?? 'Unknown script'} (script on ${name})`;
        }
        if (step.endpointId) {
            const endpoint = endpointStore.endpoints.find(endpoint => endpoint.id === step.endpointId);
            return `${endpoint?.name ?? 'Unknown endpoint'} (${name})`;
        }
        return step.side ? `${name} (${step.side})` : name;
    }

    function getStepIcon(step: ChainStep) {
        if (step.componentId) return 'pi pi-code';
        const endpoint = endpointStore.endpoints.find(endpoint => endpoint.id === step.endpointId);
        return endpoint ? getEndpointTypeInfo(endpoint.type).icon : undefined;
    }

    return { getChain, getStepLabel, getStepIcon };
}
