<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useUIStore } from '../stores/canvas/ui.store';
import { useInformationFieldStore } from '../stores/information/informationField.store';
import { useInformationObjectStore } from '../stores/information/informationObject.store';
import { useInformationRelationStore, type ResourceRelation } from '../stores/information/informationRelation.store';
import { useResourceService } from '../services/resources/resource.service';
import { useEndpointStore, getEndpointTypeInfo } from '../stores/endpoint.store';

interface ChainStep {
    resourceId: string;
    side?: 'input' | 'output';
    // The step is an endpoint (dashboard, map, ...) inside the resource, where the information is used
    endpointId?: string;
}

// A relation between two steps. carriedByObjectIds is empty when the information travels on its own
interface ChainEdge {
    source: ChainStep;
    target: ChainStep;
    carriedByObjectIds: string[];
}

interface ChainStepView extends ChainStep {
    // Names of the InformationObjects the searched field is part of at this step
    objectNames: string[];
}

interface ChainLinkView {
    // Names of the InformationObjects that carry the information to the next step
    objectNames: string[];
}

interface Chain {
    steps: ChainStepView[];
    // links[i] connects steps[i] to steps[i + 1]
    links: ChainLinkView[];
}

interface ChainGroup {
    id: string;
    name: string;
    chains: Chain[];
}

const UIStore = useUIStore();
const informationFieldStore = useInformationFieldStore();
const informationObjectStore = useInformationObjectStore();
const informationRelationStore = useInformationRelationStore();
const resourceService = useResourceService();
const endpointStore = useEndpointStore();

// The relations are kept up to date by CanvasView; this only makes sure they are fresh when the sheet opens
onMounted(() => {
    informationRelationStore.fetchInformationRelations();
});

const fieldSearch = computed(() => UIStore.informationFieldSearch.trim().toLowerCase());
const objectSearch = computed(() => UIStore.informationObjectSearch.trim().toLowerCase());

// A field travels on its own through its field relations, and inside an object through the relations of every object it is part of
const fieldGroups = computed<ChainGroup[]>(() => {
    if (!fieldSearch.value) return [];

    return [...informationFieldStore.informationFields.values()]
        .filter(field => field.fieldName.toLowerCase().includes(fieldSearch.value))
        .map(field => {
            const containingObjectIds = [...informationObjectStore.informationObjects.values()]
                .filter(object => object.informationFieldIds.includes(field.id))
                .map(object => object.id);

            const edges: ChainEdge[] = [
                ...informationRelationStore.fieldRelations
                    .filter(relation => relation.informationFieldId === field.id)
                    .map(relation => relationToEdge(relation)),
                ...informationRelationStore.objectRelations
                    .filter(relation => containingObjectIds.includes(relation.informationObjectId))
                    .map(relation => relationToEdge(relation, relation.informationObjectId)),
                ...getFieldEndpointEdges(field.id, containingObjectIds)
            ];

            return {
                id: field.id,
                name: field.fieldName,
                chains: buildChains(edges, step => getContainingObjectIds(step, containingObjectIds))
            };
        });
});

const objectGroups = computed<ChainGroup[]>(() => {
    if (!objectSearch.value) return [];

    return [...informationObjectStore.informationObjects.values()]
        .filter(object => object.objectName.toLowerCase().includes(objectSearch.value))
        .map(object => ({
            id: object.id,
            name: object.objectName,
            chains: buildChains(
                [
                    ...informationRelationStore.objectRelations
                        .filter(relation => relation.informationObjectId === object.id)
                        .map(relation => relationToEdge(relation)),
                    ...getObjectEndpointEdges(object.id)
                ],
                () => []
            )
        }));
});

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
function getContainingObjectIds(step: ChainStep, objectIds: string[]): string[] {
    const resource = resourceService.getResource(step.resourceId);
    if (resource?.type !== 'application' || !step.side || step.endpointId) return [];

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

function stepKey(step: ChainStep) {
    if (step.endpointId) return `endpoint:${step.endpointId}`;
    return `${step.resourceId}:${step.side ?? ''}`;
}

// Returns every path from a start (nothing flows into it) to an end (nothing flows out of it)
function buildChains(edges: ChainEdge[], getStepObjectIds: (step: ChainStep) => string[]): Chain[] {
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
                    objectNames: getObjectNames(getStepObjectIds(step))
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

function stepLabel(step: ChainStep) {
    const name = resourceService.getResource(step.resourceId)?.name ?? 'Unknown resource';
    if (step.endpointId) {
        const endpoint = endpointStore.endpoints.find(endpoint => endpoint.id === step.endpointId);
        return `${endpoint?.name ?? 'Unknown endpoint'} (${name})`;
    }
    return step.side ? `${name} (${step.side})` : name;
}

function stepIcon(step: ChainStep) {
    const endpoint = endpointStore.endpoints.find(endpoint => endpoint.id === step.endpointId);
    return endpoint ? getEndpointTypeInfo(endpoint.type).icon : undefined;
}
</script>

<template>
    <div class="relation-chains">
        <div
            v-if="!fieldSearch && !objectSearch"
            class="empty-row"
        >
            Search an information field or information object to see its relationship chains
        </div>

        <section
            v-for="section in [
                { title: 'Information fields', search: fieldSearch, groups: fieldGroups },
                { title: 'Information objects', search: objectSearch, groups: objectGroups }
            ]"
            v-show="section.search"
            :key="section.title"
        >
            <div class="section-title">
                <span>{{ section.title }}</span>

                <span
                    v-if="section.groups === fieldGroups"
                    class="legend"
                >
                    <span class="chain-step in-object">▱ dashed</span> = inside an information object
                </span>
            </div>

            <div
                v-if="!section.groups.length"
                class="empty-row"
            >
                Nothing found
            </div>

            <div
                v-for="group in section.groups"
                :key="group.id"
                class="chain-group"
            >
                <div class="group-name">
                    {{ group.name }}
                </div>

                <div
                    v-if="!group.chains.length"
                    class="empty-row"
                >
                    No relations
                </div>

                <div
                    v-for="(chain, chainIndex) in group.chains"
                    :key="chainIndex"
                    class="chain"
                >
                    <template
                        v-for="(step, stepIndex) in chain.steps"
                        :key="stepIndex"
                    >
                        <span
                            v-if="stepIndex > 0"
                            class="chain-link"
                            :class="{ 'via-object': chain.links[stepIndex - 1]?.objectNames.length }"
                        >
                            <span
                                v-if="chain.links[stepIndex - 1]?.objectNames.length"
                                class="link-label"
                            >
                                {{ chain.links[stepIndex - 1]?.objectNames.join(', ') }}
                            </span>
                            <span class="chain-arrow">→</span>
                        </span>

                        <span
                            class="chain-step"
                            :class="{ 'in-object': step.objectNames.length, endpoint: step.endpointId }"
                            :title="step.endpointId ? 'Endpoint: the information is used here' : undefined"
                        >
                            <span>
                                <i
                                    v-if="stepIcon(step)"
                                    :class="stepIcon(step)"
                                    class="endpoint-step-icon"
                                />
                                {{ stepLabel(step) }}
                            </span>

                            <span
                                v-if="step.objectNames.length"
                                class="step-objects"
                            >
                                ▱ {{ step.objectNames.join(', ') }}
                            </span>
                        </span>
                    </template>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.chain-step.endpoint {
    border-color: #c4b5fd;
    background: #faf5ff;
    color: #5b21b6;
}

.endpoint-step-icon {
    margin-right: 3px;
    color: #7c3aed;
    font-size: 10px;
}

.relation-chains {
    padding: 4px 14px 12px;
    font-size: 13px;
    color: var(--p-text-color);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 4px;

    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.legend {
    display: flex;
    align-items: center;
    gap: 4px;

    color: var(--p-text-muted-color);
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
}

.chain-group {
    margin-bottom: 8px;
}

.group-name {
    font-weight: 600;
}

.chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;

    padding: 3px 0 3px 10px;
}

.chain-step {
    display: inline-flex;
    flex-direction: column;

    padding: 1px 6px;
    border: 1px solid var(--p-content-border-color);
    border-radius: 4px;
}

.chain-step.in-object {
    border-style: dashed;
    border-color: var(--p-primary-color);
    background: var(--p-content-hover-background);
}

.step-objects {
    color: var(--p-primary-color);
    font-size: 10px;
}

.chain-link {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
}

.link-label {
    color: var(--p-primary-color);
    font-size: 10px;
    line-height: 1;
}

.chain-arrow {
    color: var(--p-text-muted-color);
}

.chain-link.via-object .chain-arrow {
    color: var(--p-primary-color);
}

.empty-row {
    padding: 4px 0;
    color: var(--p-text-muted-color);
    font-size: 11px;
    font-style: italic;
}

.chain-group .empty-row {
    padding-left: 10px;
}
</style>
