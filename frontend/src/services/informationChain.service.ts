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
import { getInformationSlotIds, type Component, type ComponentEnd, type InformationSlot } from "../types/component.types";
import type { InformationSource } from "../types/informationField.type";

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
    // The source has to reach this step, but it is not known how yet
    unconnected?: boolean;
}

export interface ChainStepView extends ChainStep {
    // Names of the InformationObjects the field is part of at this step
    objectNames: string[];
    // The breaks in the chain at this step
    breaks: ChainBreak[];
    // This step is the source of the information
    isSource: boolean;
}

export interface ChainLinkView {
    // Names of the InformationObjects that carry the information to the next step
    objectNames: string[];
    // It is not known yet how the information gets to the next step
    unconnected: boolean;
}

// One path through the chain, from a start (nothing flows into it) to an end (nothing flows out of it)
export interface Chain {
    steps: ChainStepView[];
    // links[i] connects steps[i] to steps[i + 1]
    links: ChainLinkView[];
}

// The paths merged for showing them: what paths share from their start is one step, that splits where they go apart
export interface ChainBranch {
    step: ChainStepView;
    // How the information gets here from the previous step; undefined at the start
    link?: ChainLinkView;
    children: ChainBranch[];
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
// - notConnected: the information is here, but it is not known how it gets here from the source (a warning)
export type ChainBreakKind = 'noSource' | 'sourceNotHeld' | 'unknownOrigin' | 'sourceMissing' | 'endpointMissing' | 'deadEnd' | 'notConnected';

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
    branches: ChainBranch[];
    // The objects a field is part of
    containingObjectNames: string[];
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
            return assemble(kind, id, field.fieldName, field.source, getContainingObjectIdsOf(id));
        }

        const object = informationObjectStore.getInformationObject(id);
        if (!object) return undefined;
        return assemble(kind, id, object.objectName, object.source, []);
    }

    function assemble(kind: InformationKind, id: string, name: string, source: InformationSource | null, containingObjectIds: string[]): InformationChain {
        const sourceId = source?.resourceId ?? null;
        const holders = getHolders(kind, id, containingObjectIds);
        const relations = getRelations(kind, id, containingObjectIds);
        const endHas = getEndHas(kind, id);
        const externalEdges = [...getExternalEdges(holders, relations, endHas), ...getScriptEdges(holders, endHas)];
        const edges = [
            ...(kind === 'field' ? getFieldEdges(id, containingObjectIds) : getObjectEdges(id)),
            ...externalEdges
        ];
        const holderBreaks = getBreaks(kind, id, sourceId, containingObjectIds, relations, externalEdges, holders, endHas);

        const steps = new Map<string, ChainStep>();
        edges.forEach(edge => {
            steps.set(stepKey(edge.source), edge.source);
            steps.set(stepKey(edge.target), edge.target);
        });

        // Inside one application the information goes from the input to the output, also without a relation for it
        const holderSteps = holders.map(holderToStep);
        const heldKeys = new Set(holderSteps.map(stepKey));
        const throughEdges: ChainEdge[] = holderSteps
            .filter(step => step.side === 'input' && heldKeys.has(stepKey({ resourceId: step.resourceId, side: 'output' })))
            .filter(step => !edges.some(edge =>
                stepKey(edge.source) === stepKey(step) && stepKey(edge.target) === stepKey({ resourceId: step.resourceId, side: 'output' })
            ))
            .map(step => ({ source: step, target: { resourceId: step.resourceId, side: 'output' }, carriedByObjectIds: [] }));
        throughEdges.forEach(edge => {
            steps.set(stepKey(edge.source), edge.source);
            steps.set(stepKey(edge.target), edge.target);
        });

        const sourceStep = source && resourceService.getResource(source.resourceId) ? getSourceStep(source) : undefined;
        const flowEdges = sourceStep ? toSourceFlow([...edges, ...throughEdges], sourceStep) : [...edges, ...throughEdges];
        const flowKeys = new Set(flowEdges.flatMap(edge => [stepKey(edge.source), stepKey(edge.target)]));
        const ownInputKey = sourceStep?.side === 'output' ? stepKey({ resourceId: sourceStep.resourceId, side: 'input' }) : undefined;

        // Places that hold the information without any relation still show: as a chain of their own,
        // or with a source as the next thing to connect to it
        const looseSteps = new Map<string, ChainStep>();
        [...holderSteps, ...(sourceStep ? [sourceStep] : [])]
            .filter(step => !flowKeys.has(stepKey(step)) && stepKey(step) !== ownInputKey)
            .forEach(step => looseSteps.set(stepKey(step), step));
        looseSteps.forEach((step, key) => steps.set(key, step));

        const unconnectedSteps = sourceStep ? getUnconnectedSteps(sourceStep, flowEdges, [...looseSteps.values()]) : [];
        const unconnectedEdges: ChainEdge[] = unconnectedSteps.map(target => ({ source: sourceStep!, target, carriedByObjectIds: [], unconnected: true }));

        // A source with a broken arrow is not a dead end: where it goes is known, how it gets there is not
        const noun = kind === 'field' ? 'field' : 'object';
        const breaks: ChainBreak[] = [
            ...holderBreaks.filter(chainBreak =>
                !(unconnectedSteps.length && chainBreak.kind === 'deadEnd' && chainBreak.stepKey === (sourceStep && stepKey(sourceStep)))
            ),
            ...unconnectedSteps.map(step => ({
                kind: 'notConnected' as const,
                severity: 'warning' as const,
                message: `It is not known yet how this ${noun} gets from ${getStepLabel(sourceStep!)} to ${getStepLabel(step)}`,
                stepKey: stepKey(step)
            }))
        ];

        const chains = buildChains(
            [...flowEdges, ...unconnectedEdges],
            [...looseSteps.values()],
            step => kind === 'field' ? getStepObjectIds(step, containingObjectIds) : [],
            key => breaks.filter(chainBreak => chainBreak.stepKey === key),
            sourceStep && stepKey(sourceStep)
        );

        let status: ChainStatus = 'complete';
        if (breaks.some(chainBreak => chainBreak.severity === 'error')) status = 'broken';
        else if (breaks.some(chainBreak => chainBreak.kind === 'noSource')) status = 'noSource';
        else if (breaks.length) status = 'warning';

        return { kind, id, name, steps: [...steps.values()], edges, chains, branches: mergeChains(chains), containingObjectNames: getObjectNames(containingObjectIds), holders, breaks, status };
    }

    // ---- The source ----

    // An application has the information to send on at its output, and a file is a step of its own
    function getSourceStep(source: InformationSource): ChainStep {
        if (source.componentId) return { resourceId: source.resourceId, componentId: source.componentId };
        return source.resourceType === 'application' ? { resourceId: source.resourceId, side: 'output' } : { resourceId: source.resourceId };
    }

    // What leaves the source can be stored one level up: a relation goes from a file location or a database, not from
    // its file or table. An application that is the source can also have the information as an input: without anything
    // feeding that input it says nothing about the route, so it is left out
    function toSourceFlow(edges: ChainEdge[], sourceStep: ChainStep): ChainEdge[] {
        const parentId = sourceStep.componentId ? sourceStep.resourceId : getDatabaseId(sourceStep.resourceId);
        const flow = edges
            .map(edge => edge.source.resourceId === parentId && !edge.source.componentId && !edge.source.endpointId
                ? { ...edge, source: sourceStep }
                : edge)
            .filter(edge => stepKey(edge.source) !== stepKey(edge.target));
        if (sourceStep.side !== 'output') return flow;

        const sourceKey = stepKey(sourceStep);
        const inputKey = stepKey({ resourceId: sourceStep.resourceId, side: 'input' });
        const isOwnInput = !flow.some(edge => stepKey(edge.target) === inputKey) &&
            flow.every(edge => stepKey(edge.source) !== inputKey || stepKey(edge.target) === sourceKey);
        return isOwnInput ? flow.filter(edge => stepKey(edge.source) !== inputKey) : flow;
    }

    // The first steps of everything the source does not reach: these get a broken arrow from the source.
    // Steps that only a loop leads to have no first step, so the first of them that is left is used
    function getUnconnectedSteps(sourceStep: ChainStep, edges: ChainEdge[], looseSteps: ChainStep[]): ChainStep[] {
        const steps = new Map<string, ChainStep>(looseSteps.map(step => [stepKey(step), step]));
        const next = new Map<string, string[]>();
        const hasIncoming = new Set<string>();
        for (const edge of edges) {
            steps.set(stepKey(edge.source), edge.source);
            steps.set(stepKey(edge.target), edge.target);
            hasIncoming.add(stepKey(edge.target));
            next.set(stepKey(edge.source), [...(next.get(stepKey(edge.source)) ?? []), stepKey(edge.target)]);
        }

        const reached = new Set<string>();
        function reach(key: string) {
            if (reached.has(key)) return;
            reached.add(key);
            next.get(key)?.forEach(reach);
        }
        reach(stepKey(sourceStep));

        const unconnected: ChainStep[] = [];
        function connect(key: string) {
            if (reached.has(key)) return;
            unconnected.push(steps.get(key)!);
            reach(key);
        }
        [...steps.keys()].filter(key => !hasIncoming.has(key)).forEach(connect);
        [...steps.keys()].forEach(connect);

        return unconnected;
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
                .flatMap(relation => relationToEdges(relation, getEndHas('field', informationFieldId))),
            ...informationRelationStore.objectRelations
                .filter(relation => containingObjectIds.includes(relation.informationObjectId))
                .flatMap(relation => relationToEdges(relation, getEndHas('object', relation.informationObjectId), relation.informationObjectId)),
            ...getFieldEndpointEdges(informationFieldId, containingObjectIds)
        ];
    }

    function getObjectEdges(informationObjectId: string): ChainEdge[] {
        return [
            ...informationRelationStore.objectRelations
                .filter(relation => relation.informationObjectId === informationObjectId)
                .flatMap(relation => relationToEdges(relation, getEndHas('object', informationObjectId))),
            ...getObjectEndpointEdges(informationObjectId)
        ];
    }

    // Whether a script reads the information from one end or writes it to one end, a field also inside such an object
    function getEndHas(kind: InformationKind, id: string): (end: ComponentEnd) => boolean {
        if (kind === 'object') return end => end.informationObjectIds.includes(id);
        return end => end.informationFieldIds.includes(id) ||
            end.informationObjectIds.some(objectId =>
                informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(id)
            );
    }

    // A script only carries information from where it reads it to where it writes it
    function passesThrough(script: Component, relation: ResourceRelation, endHas: (end: ComponentEnd) => boolean) {
        const isEndOf = (end: ComponentEnd, resourceId: string) =>
            end.resourceId === resourceId || end.resourceId === getDatabaseId(resourceId);
        return script.inputs.some(end => isEndOf(end, relation.sourceResourceId) && endHas(end)) &&
            script.outputs.some(end => isEndOf(end, relation.targetResourceId) && endHas(end));
    }

    // Tables are connected through their database
    function getDatabaseId(resourceId: string) {
        const resource = resourceService.getResource(resourceId);
        if (resource?.type === 'table') return resource.databaseId;
        return undefined;
    }

    // The scripts the information goes through on its way from the source to the target of the relation: the script
    // the relation is set to go via, or, when nothing is set, the scripts that read the information from the source
    // and write it to the target
    function getRelationScripts(relation: ResourceRelation, endHas: (end: ComponentEnd) => boolean): Component[] {
        if (relation.sourceResourceId === relation.targetResourceId) return [];

        if (relation.viaConnectionType === 'component' && relation.viaConnectionId) {
            const script = componentStore.getComponent(relation.viaConnectionId);
            return script ? [script] : [];
        }
        if (relation.viaConnectionType) return [];

        const sourceIds = [relation.sourceResourceId, getDatabaseId(relation.sourceResourceId)].filter(id => id !== undefined);
        const targetIds = [relation.targetResourceId, getDatabaseId(relation.targetResourceId)].filter(id => id !== undefined);
        return componentStore.getScriptsBetween(sourceIds, targetIds).filter(script => passesThrough(script, relation, endHas));
    }

    // A relation that goes through a script gets the script as a step in between: source -> script -> target
    function relationToEdges(relation: ResourceRelation, endHas: (end: ComponentEnd) => boolean, carriedByObjectId?: string): ChainEdge[] {
        const edge = relationToEdge(relation, carriedByObjectId);
        const scripts = getRelationScripts(relation, endHas);
        if (!scripts.length) return [edge];

        return scripts.flatMap(script => {
            const scriptStep: ChainStep = { resourceId: script.resourceId, componentId: script.id };
            // A script reads into its host and writes from its host: there the script is the step of the host
            if (script.resourceId === relation.targetResourceId) {
                return [{ source: edge.source, target: scriptStep, carriedByObjectIds: edge.carriedByObjectIds }];
            }
            if (script.resourceId === relation.sourceResourceId) {
                return [{ source: scriptStep, target: edge.target, carriedByObjectIds: edge.carriedByObjectIds }];
            }
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

    // Returns every path from a start (nothing flows into it) to an end (nothing flows out of it).
    // looseSteps: steps without any edge, each one a chain of its own.
    // sourceKey: the source, which is then the one start of every path
    function buildChains(
        edges: ChainEdge[],
        looseSteps: ChainStep[],
        getStepObjectIdsOf: (step: ChainStep) => string[],
        getStepBreaks: (key: string) => ChainBreak[],
        sourceKey?: string
    ): Chain[] {
        const steps = new Map<string, ChainStep>(looseSteps.map(step => [stepKey(step), step]));
        const next = new Map<string, string[]>();
        const hasIncoming = new Set<string>();
        // The same hop can exist on its own and in one or more objects; they are merged into one link
        const linkObjectIds = new Map<string, Set<string>>();
        const unconnectedLinks = new Set<string>();

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
            if (edge.unconnected) unconnectedLinks.add(linkKey);
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
                        breaks: getStepBreaks(key),
                        isSource: key === sourceKey
                    };
                }),
                links: path.slice(1).map((key, index) => ({
                    objectNames: getObjectNames([...(linkObjectIds.get(`${path[index]}|${key}`) ?? [])]),
                    unconnected: unconnectedLinks.has(`${path[index]}|${key}`)
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

        if (sourceKey) {
            walk(sourceKey, []);
        }
        else {
            for (const key of steps.keys()) {
                if (!hasIncoming.has(key)) walk(key, []);
            }
        }
        // Whatever is left over is part of a loop without a start
        for (const key of steps.keys()) {
            if (!visited.has(key)) walk(key, []);
        }

        return chains;
    }

    function mergeChains(chains: Chain[]): ChainBranch[] {
        const starts: ChainBranch[] = [];

        for (const chain of chains) {
            let siblings = starts;
            chain.steps.forEach((step, index) => {
                let branch = siblings.find(sibling => stepKey(sibling.step) === stepKey(step));
                if (!branch) {
                    branch = { step, link: chain.links[index - 1], children: [] };
                    siblings.push(branch);
                }
                siblings = branch.children;
            });
        }

        return starts;
    }

    // ---- Holders ----

    // The step of the chain a place is: an application has an input and an output side
    function holderToStep(holder: ChainHolder): ChainStep {
        if (holder.endpointId) return { resourceId: holder.resourceId, endpointId: holder.endpointId };
        if (holder.componentId) return { resourceId: holder.resourceId, componentId: holder.componentId };
        if (holder.role === 'input' || holder.role === 'output') return { resourceId: holder.resourceId, side: holder.role };
        return { resourceId: holder.resourceId };
    }

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

        // A table only has fields: it holds an object when it has a column for each of the fields of the object
        const objectFieldIds = kind === 'object' ? informationObjectStore.getInformationObject(id)?.informationFieldIds ?? [] : [];
        for (const table of tableStore.tables) {
            const columnIds = table.columns.map(column => column.id);
            const holdsObject = objectFieldIds.length > 0 && objectFieldIds.every(fieldId => columnIds.includes(fieldId));
            add({ resourceId: table.id, role: 'column' }, columnIds, holdsObject ? [id] : []);
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
    // input, a table, a script reading it from the external element). A script that writes the information to an external element sends it there.
    function getExternalEdges(holders: ChainHolder[], relations: ResourceRelation[], endHas: (end: ComponentEnd) => boolean): ChainEdge[] {
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
                    if (!script?.inputs.some(end => end.resourceId === provider.resourceId && endHas(end))) continue;
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
                if (!isExternal(end.resourceId) || !endHas(end)) continue;
                // A relation through the script already shows how the information gets there
                if (relations.some(relation =>
                    relation.viaConnectionType === 'component' &&
                    relation.viaConnectionId === holder.componentId &&
                    relation.targetResourceId === end.resourceId
                )) continue;
                edges.push({
                    source: { resourceId: holder.resourceId, componentId: holder.componentId },
                    target: { resourceId: end.resourceId },
                    carriedByObjectIds: holder.direct ? [] : holder.objectIds
                });
            }
        }

        return edges;
    }

    // ---- Scripts ----

    // Relations only go between resources, so what a script reads and writes is not in them. A relation through a
    // script only exists when the script reads the information from one resource and writes it to another.
    // The reads and writes of the script itself are added as edges: what it reads the information from -> script,
    // and script -> what it writes it to. External elements are left to getExternalEdges.
    function getScriptEdges(holders: ChainHolder[], endHas: (end: ComponentEnd) => boolean): ChainEdge[] {
        const edges: ChainEdge[] = [];

        // A file, or a resource that holds the information itself (not a database: its tables hold the information)
        function toStep(end: ComponentEnd, side: 'input' | 'output'): ChainStep | undefined {
            if (end.componentId) {
                return holders.some(holder => holder.componentId === end.componentId)
                    ? { resourceId: end.resourceId, componentId: end.componentId }
                    : undefined;
            }
            const resource = resourceService.getResource(end.resourceId);
            if (!resource || resource.type === 'external') return undefined;
            if (!holders.some(holder => holder.resourceId === end.resourceId && !holder.componentId && !holder.endpointId)) return undefined;
            return resource.type === 'application' ? { resourceId: end.resourceId, side } : { resourceId: end.resourceId };
        }

        const scriptIds = new Set(holders.filter(holder => holder.componentId).map(holder => holder.componentId!));
        for (const scriptId of scriptIds) {
            const script = componentStore.getComponent(scriptId);
            if (script?.kind !== 'script') continue;
            const scriptStep: ChainStep = { resourceId: script.resourceId, componentId: script.id };

            for (const end of script.inputs.filter(endHas)) {
                const source = toStep(end, 'output');
                if (source) edges.push({ source, target: scriptStep, carriedByObjectIds: [] });
            }
            for (const end of script.outputs.filter(endHas)) {
                const target = toStep(end, 'input');
                if (target) edges.push({ source: scriptStep, target, carriedByObjectIds: [] });
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
        holders: ChainHolder[],
        endHas: (end: ComponentEnd) => boolean
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

        // A script that takes the information in, but does not read it from anything that has it
        for (const holder of holders) {
            if (holder.role !== 'input' || !holder.componentId) continue;
            const script = componentStore.getComponent(holder.componentId);
            if (!script) continue;
            const fed = script.inputs.some(end => endHas(end) && (end.componentId
                ? holders.some(other => other.componentId === end.componentId && other.role !== 'input')
                : resourceProvides(holders, end.resourceId)
            ));
            if (!fed) {
                const step: ChainStep = { resourceId: holder.resourceId, componentId: holder.componentId };
                breaks.push({
                    kind: 'unknownOrigin',
                    severity: 'warning',
                    message: `${getStepLabel(step)} takes this ${noun} in, but does not read it from anything that has it`,
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
            const component = componentStore.getComponent(step.componentId);
            if (component?.kind === 'file') return `${component.name} (file in ${name})`;
            return `${component?.name ?? 'Unknown script'} (script on ${name})`;
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
