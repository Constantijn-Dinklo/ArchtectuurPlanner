<script setup lang="ts">
import { vCollapsible } from '../../directives/collapsible';
import { computed, ref } from 'vue';
import { Select } from 'primevue';
import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
import { useApplicationStore } from '../../stores/resources/application.store.ts';
import { useResourceService } from '../../services/resources/resource.service.ts';
import type {
    AccessibleInformationField,
    InformationField
} from '../../types/informationField.type.ts';
import type {
    AccessibleInformationObject,
    ResolvedInformationObject
} from '../../types/informationObject.type.ts';
import { useApplicationService } from '../../services/resources/application.service.ts';
import { useInformationObjectService } from '../../services/informationObject.service.ts';
import { useInformationEndpointService } from '../../services/informationEndpoint.service.ts';
import { useApiStore, type Api } from '../../stores/api.store.ts';
import { useInformationTransferService } from '../../services/informationTransfer.service.ts';
import { useInformationSourceService, type CandidateConnection } from '../../services/informationSource.service.ts';
import { useInformationRelationStore } from '../../stores/information/informationRelation.store.ts';
import ViaConnection from './ViaConnection.vue';
import EndpointsSection from './EndpointsSection.vue';
import ConnectionPartnersSection from './ConnectionPartnersSection.vue';
import { useApiConnectionStore } from '../../stores/apiConnection.store.ts';
import { APPLICATION_HOSTINGS, type ResolvedApplication } from '../../types/application.types.ts';

const resourceService = useResourceService();
const selectedNodeProjection = useSelectedNodeProjection();
const applicationStore = useApplicationStore();
const applicationService = useApplicationService();
const informationObjectService = useInformationObjectService();
const informationEndpointService = useInformationEndpointService();
const apiStore = useApiStore();
const apiConnectionStore = useApiConnectionStore();
const informationTransferService = useInformationTransferService();
const informationSourceService = useInformationSourceService();
const informationRelationStore = useInformationRelationStore();

// Returns a warning when the input comes from another application without an api url that sends it
function getUnsentFieldWarning(applicationId: string, informationFieldId: string) {
    const sourceId = informationTransferService.getUnsentInputFieldSource(applicationId, informationFieldId);
    if (!sourceId) return undefined;
    return `Sent from ${resourceService.getResource(sourceId)?.name ?? 'another application'} without an API url or other connection that carries it`;
}

function getUnsentObjectWarning(applicationId: string, informationObjectId: string) {
    const sourceId = informationTransferService.getUnsentInputObjectSource(applicationId, informationObjectId);
    if (!sourceId) return undefined;
    return `Sent from ${resourceService.getResource(sourceId)?.name ?? 'another application'} without an API url or other connection that carries it`;
}


const inputInformationField = ref<AccessibleInformationField & { via?: CandidateConnection }>();
const forwardedInformationField = ref<InformationField>();

const newInputInformationFieldName = ref('');
const newOutputInformationFieldName = ref('');


const inputInformationObject = ref<AccessibleInformationObject & { via?: CandidateConnection }>();
const forwardedInformationObject = ref<ResolvedInformationObject>();

const newInputInformationObjectName = ref('');
const newOutputInformationObjectName = ref('');


const selectedObjectInformationFields = ref<
    Record<string, AccessibleInformationField | undefined>
>({});

const newObjectInformationFieldNames = ref<Record<string, string>>({});



const expandedInformationObjects = ref<Set<string>>(new Set());

function toggleInformationObject(informationObjectId: string) {
    const expanded = new Set(expandedInformationObjects.value);

    if (expanded.has(informationObjectId)) {
        expanded.delete(informationObjectId);
    } else {
        expanded.add(informationObjectId);
    }

    expandedInformationObjects.value = expanded;
}



const application = computed(
    () => selectedNodeProjection.nodeInfo.value?.node as ResolvedApplication | undefined
);

const connectedInputFields = computed(() =>
    application.value?.inputInformationFields.filter(field => field.position > 0) ?? []
);

const localInputFields = computed(() =>
    application.value?.inputInformationFields.filter(field => field.position === 0) ?? []
);

const forwardedOutputFields = computed(() =>
    application.value?.outputInformationFields.filter(field => field.position > 0) ?? []
);

const localOutputFields = computed(() =>
    application.value?.outputInformationFields.filter(field => field.position === 0) ?? []
);

// Information can come through several connections. Every connection gets its own option, so the user picks
// the connection together with the information, e.g. "customerId — Webshop · via API https://…/orders".
// Information that does not come through any connection gets one option with "(none)".
function withConnectionOptions<T extends { accessibleFromId: string }>(
    items: T[],
    getName: (item: T) => string,
    getCandidates: (item: T) => CandidateConnection[]
) {
    return items.flatMap((item): (T & { via?: CandidateConnection, label: string })[] => {
        const sourceName = resourceService.getResource(item.accessibleFromId)?.name ?? '?';
        const candidates = getCandidates(item);

        if (!candidates.length) {
            return [{ ...item, via: undefined, label: `${getName(item)} — ${sourceName} · (none)` }];
        }
        return candidates.map(candidate => ({
            ...item,
            via: candidate,
            label: `${getName(item)} — ${sourceName} · via ${candidate.label}`
        }));
    });
}

// Every accessible field once, for places that do not care about the connection
const accessibleInputFieldsOnce = computed(() =>
    application.value ? resourceService.getAccessibleInformationFields(application.value.id) : []
);

const accessibleInputFields = computed(() => {
    if (!application.value) return [];
    const applicationId = application.value.id;

    return withConnectionOptions(
        resourceService.getAccessibleInformationFields(applicationId),
        field => field.fieldName,
        field => informationSourceService.getCandidateConnections(field.accessibleFromId, applicationId, { informationFieldId: field.id })
    );
});

const accessibleInformationObjects = computed(() => {
    if (!application.value) return [];
    const applicationId = application.value.id;

    return withConnectionOptions(
        resourceService.getAccessibleInformationObjects(applicationId),
        informationObject => informationObject.objectName,
        informationObject => informationSourceService.getCandidateConnections(informationObject.accessibleFromId, applicationId, { informationObjectId: informationObject.id })
    );
});

// The relation through which an input field or object comes into this application from another resource
function getInputFieldRelation(informationFieldId: string) {
    const applicationId = application.value?.id;
    return informationRelationStore.fieldRelations.find(relation =>
        relation.targetResourceId === applicationId &&
        relation.sourceResourceId !== applicationId &&
        relation.informationFieldId === informationFieldId
    );
}

function getInputObjectRelation(informationObjectId: string) {
    const applicationId = application.value?.id;
    return informationRelationStore.objectRelations.find(relation =>
        relation.targetResourceId === applicationId &&
        relation.sourceResourceId !== applicationId &&
        relation.informationObjectId === informationObjectId
    );
}

// <-- APIs -->
const applicationApis = computed(() =>
    application.value ? apiStore.getApplicationApis(application.value.id) : []
);


// Every api card starts collapsed and can be opened to see and edit what is sent through it
const expandedApis = ref<Set<string>>(new Set());

function toggleApi(apiId: string) {
    const expanded = new Set(expandedApis.value);
    if (expanded.has(apiId)) {
        expanded.delete(apiId);
    } else {
        expanded.add(apiId);
    }
    expandedApis.value = expanded;
}
const newApiUrl = ref('');

// An api url that no api connection uses is shown in a warning colour
function isApiUsed(apiId: string) {
    return apiConnectionStore.apiConnections.some(connection => connection.sourceUrlId === apiId);
}

const unusedApiCount = computed(() => applicationApis.value.filter(applicationApi => !isApiUsed(applicationApi.id)).length);

async function addApi(applicationId: string) {
    const url = newApiUrl.value.trim();
    if (!url) return;
    await apiStore.commitApi(applicationId, url);
    newApiUrl.value = '';
}

interface SendableField {
    id: string;
    fieldName: string;
    // The output objects the field is part of; empty when it is only a standalone output field
    objectNames: string[];
    label: string;
}

// An api can send the standalone output fields, and also the fields of the output objects individually
const sendableFields = computed<SendableField[]>(() => {
    if (!application.value) return [];

    const fields = new Map<string, SendableField>();

    for (const reference of application.value.outputInformationFields) {
        fields.set(reference.informationField.id, {
            id: reference.informationField.id,
            fieldName: reference.informationField.fieldName,
            objectNames: [],
            label: reference.informationField.fieldName
        });
    }

    for (const reference of application.value.outputInformationObjects) {
        for (const field of reference.informationObject.informationFields) {
            const sendableField = fields.get(field.id) ?? {
                id: field.id,
                fieldName: field.fieldName,
                objectNames: [],
                label: field.fieldName
            };
            sendableField.objectNames.push(reference.informationObject.objectName);
            sendableField.label = `${field.fieldName} (${sendableField.objectNames.join(', ')})`;
            fields.set(field.id, sendableField);
        }
    }

    return [...fields.values()];
});

// Only shows information that the application can still send
function getApiFields(applicationApi: Api) {
    return sendableFields.value.filter(field => applicationApi.informationFieldIds?.includes(field.id));
}

function getApiObjects(applicationApi: Api) {
    return (application.value?.outputInformationObjects ?? [])
        .map(reference => reference.informationObject)
        .filter(informationObject => applicationApi.informationObjectIds?.includes(informationObject.id));
}

// Only the changed property is sent; the information of the application has its own routes
function updateProperty(property: 'version' | 'developer' | 'hosting' | 'websiteUrl', value: string) {
    if (!application.value) return;
    applicationStore.updateApplication(application.value.id, { [property]: value });
}

// A website typed without a protocol is opened as https
function websiteHref(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// <-- Information Field -->
function addInputInformationField(applicationId: string) {
    if (!inputInformationField.value) return;

    applicationService.addApplicationInformationField(applicationId, {
        informationFieldId: inputInformationField.value.id,
        sourceResourceId: inputInformationField.value.accessibleFromId,
        sourceResourceType: inputInformationField.value.accessibleFromType,
        viaConnectionType: inputInformationField.value.via?.type ?? null,
        viaConnectionId: inputInformationField.value.via?.id ?? null
    });

    inputInformationField.value = undefined;
}

function addForwardedInformationField(applicationId: string) {
    if (!forwardedInformationField.value) return;

    applicationService.addApplicationInformationField(
        applicationId,
        {
            informationFieldId: forwardedInformationField.value.id,
            sourceResourceId: applicationId,
            sourceResourceType: 'application'
        },
        'output'
    );

    forwardedInformationField.value = undefined;
}

function newInformationField(
    applicationId: string,
    direction: 'input' | 'output' = 'input'
) {
    const fieldName =
        direction === 'input'
            ? newInputInformationFieldName.value.trim()
            : newOutputInformationFieldName.value.trim();

    if (!fieldName) return;

    applicationService.addApplicationInformationField(
        applicationId,
        { fieldName },
        direction
    );

    if (direction === 'input') {
        newInputInformationFieldName.value = '';
    } else {
        newOutputInformationFieldName.value = '';
    }
}

function deleteInformationField(
    applicationId: string,
    informationFieldId: string,
    direction: 'input' | 'output' = 'input'
) {
    applicationService.deleteApplicationInformationField(
        applicationId,
        informationFieldId,
        direction
    );
}

// <-- Information Object -->
function addInputInformationObject(applicationId: string) {
    if (!inputInformationObject.value) return;

    applicationService.addApplictionInformationObject(applicationId, {
        informationObjectId: inputInformationObject.value.id,
        sourceResourceId: inputInformationObject.value.accessibleFromId,
        sourceResourceType: inputInformationObject.value.accessibleFromType,
        viaConnectionType: inputInformationObject.value.via?.type ?? null,
        viaConnectionId: inputInformationObject.value.via?.id ?? null
    });

    inputInformationObject.value = undefined;
}

function addForwardedInformationObject(applicationId: string) {
    if (!forwardedInformationObject.value) return;

    applicationService.addApplictionInformationObject(
        applicationId,
        {
            informationObjectId: forwardedInformationObject.value.id,
            sourceResourceId: applicationId,
            sourceResourceType: 'application'
        },
        'output'
    );

    forwardedInformationObject.value = undefined;
}

function newInformationObject(applicationId: string, direction: 'input' | 'output' = 'input') {
    const objectName =
        direction === 'input'
            ? newInputInformationObjectName.value.trim()
            : newOutputInformationObjectName.value.trim();

    if (!objectName) return;

    applicationService.addApplictionInformationObject(
        applicationId,
        { objectName },
        direction
    );

    if(direction === 'input') {
        newInputInformationObjectName.value = ''
    } else {
        newOutputInformationObjectName.value = ''
    }
}

function deleteInformationObject(applicationId: string, informationObjectId: string, direction: 'input' | 'output' = 'input') {
    applicationService.deleteApplicationInformationObject(
        applicationId, 
        informationObjectId, 
        direction
    );
}

function addExistingFieldToInformationObject(
    informationObjectId: string
) {
    const informationField =
        selectedObjectInformationFields.value[informationObjectId];

    if (!informationField) return;

    informationObjectService.addInformationFieldToInformationObject(
        informationObjectId,
        { informationFieldId: informationField.id }
    );

    selectedObjectInformationFields.value[informationObjectId] = undefined;
}

function addNewFieldToInformationObject(
    informationObjectId: string
) {
    const fieldName =
        newObjectInformationFieldNames.value[informationObjectId]?.trim();

    if (!fieldName) return;

    informationObjectService.addInformationFieldToInformationObject(
        informationObjectId,
        { fieldName }
    );

    newObjectInformationFieldNames.value[informationObjectId] = '';
}

function isInformationObjectExpanded(informationObjectId: string) {
    return expandedInformationObjects.value.has(informationObjectId);
}
</script>

<template>
    <div v-if="application" class="application-detail">

        <!-- Application -->
        <header class="application-header">
            <span class="header-icon"><i class="pi pi-desktop" /></span>

            <div class="header-text">
                <span class="type-label">Application</span>
                <h2>{{ application.name }}</h2>
            </div>
        </header>

        <section v-collapsible class="information-section">
            <div class="section-title">
                <span>Properties</span>
            </div>

            <label class="detail-property">
                <span class="detail-property-label">Version</span>
                <input
                    :value="application.version"
                    type="text"
                    class="detail-input"
                    placeholder="e.g. 2.4.1"
                    @change="updateProperty('version', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label class="detail-property">
                <span class="detail-property-label">Organisation</span>
                <input
                    :value="application.developer"
                    type="text"
                    class="detail-input"
                    placeholder="The developer of the application"
                    @change="updateProperty('developer', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label class="detail-property">
                <span class="detail-property-label">Hosting</span>
                <select
                    :value="application.hosting ?? 'unknown'"
                    class="detail-select"
                    @change="updateProperty('hosting', ($event.target as HTMLSelectElement).value)"
                >
                    <option
                        v-for="option in APPLICATION_HOSTINGS"
                        :key="option.hosting"
                        :value="option.hosting"
                    >
                        {{ option.label }}
                    </option>
                </select>
            </label>

            <!-- A SaaS application runs elsewhere, so it has a website -->
            <label
                v-if="application.hosting === 'saas'"
                class="detail-property"
            >
                <span class="detail-property-label">Website</span>
                <input
                    :value="application.websiteUrl"
                    type="url"
                    class="detail-input"
                    placeholder="https://app.example.com"
                    @change="updateProperty('websiteUrl', ($event.target as HTMLInputElement).value)"
                />
                <a
                    v-if="application.websiteUrl"
                    :href="websiteHref(application.websiteUrl)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="website-link"
                    title="Open the website"
                >
                    <i class="pi pi-external-link" />
                </a>
            </label>
        </section>

        <!-- APIs: which output information is sent through each api -->
        <section v-collapsible class="information-section">
            <div class="section-title">
                <span>APIs</span>

                <span class="field-count">
                    {{ applicationApis.length }}
                </span>

                <span
                    v-if="unusedApiCount"
                    class="unused-api-count"
                    :title="`${unusedApiCount} API url(s) not used in any API connection`"
                >
                    <i class="pi pi-exclamation-triangle" />
                    {{ unusedApiCount }} unused
                </span>
            </div>

            <div
                v-if="!applicationApis.length"
                class="empty-row"
            >
                No APIs yet. Add the urls this application offers below.
            </div>

            <div
                v-for="applicationApi in applicationApis"
                :key="applicationApi.id"
                class="api-card"
                :class="{ unused: !isApiUsed(applicationApi.id) }"
            >
                <div
                    class="api-header"
                    @click="toggleApi(applicationApi.id)"
                >
                    <i
                        class="pi pi-chevron-right section-chevron"
                        :class="{ expanded: expandedApis.has(applicationApi.id) }"
                    />
                    <i class="pi pi-globe api-icon" />

                    <span class="api-url" :title="applicationApi.url">
                        {{ applicationApi.url }}
                    </span>

                    <span
                        v-if="applicationApi.hasAuthentication"
                        class="api-auth-badge"
                    >
                        Auth
                    </span>

                    <span
                        v-if="!isApiUsed(applicationApi.id)"
                        class="api-unused-badge"
                        title="No API connection uses this url"
                    >
                        Not used
                    </span>

                    <span
                        class="field-count"
                        title="Information objects and fields sent through this API"
                    >
                        {{ getApiObjects(applicationApi).length + getApiFields(applicationApi).length }} sent
                    </span>
                </div>

                <template v-if="expandedApis.has(applicationApi.id)">
                <div
                    v-if="!getApiObjects(applicationApi).length && !getApiFields(applicationApi).length"
                    class="empty-row"
                >
                    Nothing is sent through this API yet
                </div>

                <div class="api-chips">
                    <span
                        v-for="informationObject in getApiObjects(applicationApi)"
                        :key="informationObject.id"
                        class="api-chip object"
                    >
                        <span class="object-icon">▱</span>
                        {{ informationObject.objectName }}
                        <button
                            type="button"
                            title="Stop sending this object through the API"
                            @click="apiStore.removeInformationObject(applicationApi.id, informationObject.id)"
                        >
                            ×
                        </button>
                    </span>

                    <span
                        v-for="field in getApiFields(applicationApi)"
                        :key="field.id"
                        class="api-chip"
                        :title="field.objectNames.length ? `Part of ${field.objectNames.join(', ')}` : undefined"
                    >
                        {{ field.fieldName }}
                        <span
                            v-if="field.objectNames.length"
                            class="api-chip-object"
                        >
                            ▱ {{ field.objectNames.join(', ') }}
                        </span>
                        <button
                            type="button"
                            title="Stop sending this field through the API"
                            @click="apiStore.removeInformationField(applicationApi.id, field.id)"
                        >
                            ×
                        </button>
                    </span>
                </div>

                <!-- Only the output information of this application can be sent through its apis -->
                <div class="api-add-row">
                    <Select
                        :model-value="undefined"
                        :options="application.outputInformationObjects.map(reference => reference.informationObject)"
                        option-label="objectName"
                        :option-disabled="(informationObject: ResolvedInformationObject) =>
                            applicationApi.informationObjectIds.includes(informationObject.id)"
                        placeholder="+ Add output object"
                        filter
                        filter-placeholder="Search object"
                        empty-message="No output objects"
                        size="small"
                        class="searchable-select"
                        @change="event => event.value && apiStore.addInformationObject(applicationApi.id, event.value.id)"
                    />

                    <Select
                        :model-value="undefined"
                        :options="sendableFields"
                        option-label="label"
                        :option-disabled="(field: SendableField) =>
                            applicationApi.informationFieldIds.includes(field.id)"
                        placeholder="+ Add output field"
                        filter
                        filter-placeholder="Search field"
                        empty-message="No output fields"
                        size="small"
                        class="searchable-select"
                        @change="event => event.value && apiStore.addInformationField(applicationApi.id, event.value.id)"
                    />
                </div>
                </template>
            </div>

            <div class="new-field-row">
                <input
                    v-model="newApiUrl"
                    type="text"
                    placeholder="+ New API url"
                    @keyup.enter="addApi(application.id)"
                />
                <button
                    v-if="newApiUrl.trim()"
                    @click="addApi(application.id)"
                >
                    Add
                </button>
            </div>
        </section>

        <!-- The resources that send to this application, and the resources it sends to -->
        <ConnectionPartnersSection :resource-id="application.id" direction="incoming" />
        <ConnectionPartnersSection :resource-id="application.id" direction="outgoing" />


        <!-- INPUT -->
        <section v-collapsible class="information-section">
            <div class="section-title">
                <span>Input</span>

                <span class="field-count">
                    {{ application.inputInformationFields.length }}
                </span>
            </div>

            <!-- Future Information Objects -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Information objects</span>
                </div>

                <div
                    v-if="!application.inputInformationObjects?.length"
                    class="empty-row"
                >
                    No information objects
                </div>

                <div
                    v-for="informationObject in application.inputInformationObjects"
                    :key="informationObject.informationObject.id"
                    class="information-object"
                    :class="{ 'not-sent': getUnsentObjectWarning(application.id, informationObject.informationObject.id) }"
                    :title="getUnsentObjectWarning(application.id, informationObject.informationObject.id)"
                >
                    <div
                        class="information-object-row"
                        @click="toggleInformationObject(informationObject.informationObject.id)"
                    >
                        <i
                            class="pi pi-chevron-right expand-icon"
                            :class="{ expanded: isInformationObjectExpanded(informationObject.informationObject.id) }"
                        />

                        <span class="object-icon">▱</span>

                        <span class="field-name">
                            {{ informationObject.informationObject.objectName }}
                        </span>

                        <ViaConnection
                            v-if="informationObject.position > 0 && getInputObjectRelation(informationObject.informationObject.id)"
                            :relation="getInputObjectRelation(informationObject.informationObject.id)!"
                        />

                        <span class="object-field-count">
                            {{ informationObject.informationObject.informationFields.length }}
                        </span>

                        <button
                            type="button"
                            class="delete-button"
                            title="Delete information object"
                            @click.stop="deleteInformationObject(
                                application.id,
                                informationObject.informationObject.id
                            )"
                        >
                            ×
                        </button>
                    </div>

                    <div
                        v-if="isInformationObjectExpanded(informationObject.informationObject.id)"
                        class="information-object-fields"
                    >
                        <div
                            v-for="field in informationObject.informationObject.informationFields"
                            :key="field.id"
                            class="information-object-field"
                        >
                            <span class="field-name">
                                {{ field.fieldName }}
                            </span>

                            <button
                                class="delete-button"
                                type="button"
                                title="Remove field"
                                @click="informationObjectService.deleteInformationFieldFromInformationObject(
                                    informationObject.informationObject.id,
                                    field.id
                                )"
                            >
                                ×
                            </button>
                        </div>

                        <div
                            v-if="!informationObject.informationObject.informationFields.length"
                            class="empty-object"
                        >
                            No information fields
                        </div>

                        <!-- Add existing field -->
                        <select
                            v-model="selectedObjectInformationFields[informationObject.informationObject.id]"
                            class="inline-select object-field-select"
                            @change="addExistingFieldToInformationObject(informationObject.informationObject.id)"
                        >
                            <option :value="undefined">
                                + Add existing field
                            </option>

                            <option
                                v-for="field in accessibleInputFieldsOnce"
                                :key="field.id"
                                :value="field"
                                :disabled="informationObject.informationObject.informationFields.some(
                                    existing => existing.id === field.id
                                )"
                            >
                                {{ field.fieldName }}
                            </option>
                        </select>

                        <div class="or-divider">
                            <span>or</span>
                        </div>

                        <!-- Create new field -->
                        <div class="new-field-row">
                            <input
                                v-model="newObjectInformationFieldNames[informationObject.informationObject.id]"
                                type="text"
                                placeholder="+ New information field"
                                @keyup.enter="
                                    addNewFieldToInformationObject(informationObject.informationObject.id)
                                "
                            />
                        </div>
                    </div>
                </div>

                <div class="add-information-object">
                    <Select
                        v-model="inputInformationObject"
                        :options="accessibleInformationObjects"
                        option-label="label"
                        :option-disabled="(informationObject: AccessibleInformationObject) =>
                            application!.inputInformationObjects.some(
                                existing => existing.informationObject.id === informationObject.id
                            )"
                        placeholder="+ Add accessible object"
                        filter
                        filter-placeholder="Search object"
                        empty-message="No accessible objects"
                        size="small"
                        class="searchable-select"
                        @change="addInputInformationObject(application.id)"
                    />

                    <div class="or-divider">
                        <span>or</span>
                    </div>

                    <div class="new-field-row">
                        <input
                            v-model="newInputInformationObjectName"
                            type="text"
                            placeholder="+ New information object"
                            @keyup.enter="
                                newInformationObject(
                                    application.id,
                                    'input'
                                )
                            "
                        />

                        <!-- <button
                            v-if="newInputInformationObjectName.trim()"
                            @click="
                                newInformationObject(
                                    application.id,
                                    'input'
                                )
                            "
                        >
                            Add
                        </button> -->
                    </div>
                </div>
            </div>

            <!-- Connected -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Connected fields</span>
                </div>

                <div
                    v-for="field in connectedInputFields"
                    :key="field.informationField.id"
                    class="field-row"
                    :class="{ 'not-sent': getUnsentFieldWarning(application.id, field.informationField.id) }"
                    :title="getUnsentFieldWarning(application.id, field.informationField.id)"
                >
                    <span class="source-indicator">↳</span>

                    <span class="field-name">
                        {{ field.informationField.fieldName }}
                    </span>

                    <ViaConnection
                        v-if="getInputFieldRelation(field.informationField.id)"
                        :relation="getInputFieldRelation(field.informationField.id)!"
                    />

                    <button
                        class="delete-button"
                        @click="deleteInformationField(
                            application.id,
                            field.informationField.id
                        )"
                    >
                        ×
                    </button>
                </div>

                <Select
                    v-model="inputInformationField"
                    :options="accessibleInputFields"
                    option-label="label"
                    :option-disabled="(field: AccessibleInformationField) =>
                        application!.inputInformationFields.some(
                            existing => existing.informationField.id === field.id
                        )"
                    placeholder="+ Add connected field"
                    filter
                    filter-placeholder="Search field"
                    empty-message="No accessible fields"
                    size="small"
                    class="searchable-select"
                    @change="addInputInformationField(application.id)"
                />
            </div>

            <!-- Local fields -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Input fields</span>
                </div>

                <div
                    v-for="field in localInputFields"
                    :key="field.informationField.id"
                    class="field-row"
                >
                    <span class="field-name">
                        {{ field.informationField.fieldName }}
                    </span>

                    <button
                        class="delete-button"
                        @click="deleteInformationField(
                            application.id,
                            field.informationField.id
                        )"
                    >
                        ×
                    </button>
                </div>

                <div class="new-field-row">
                    <input
                        v-model="newInputInformationFieldName"
                        type="text"
                        placeholder="+ New input field"
                        @keyup.enter="newInformationField(application.id)"
                    />

                    <button
                        v-if="newInputInformationFieldName.trim()"
                        @click="newInformationField(application.id)"
                    >
                        Add
                    </button>
                </div>
            </div>
        </section>

        <!-- OUTPUT -->
        <section v-collapsible class="information-section">
            <div class="section-title">
                <span>Output</span>

                <span class="field-count">
                    {{ application.outputInformationFields.length }}
                </span>
            </div>

            <!-- Future Information Objects -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Information objects</span>
                </div>

                <div
                    v-if="!application.outputInformationObjects?.length"
                    class="empty-row"
                >
                    No information objects
                </div>

                <div
                    v-for="informationObject in application.outputInformationObjects"
                    :key="informationObject.informationObject.id"
                    class="field-row"
                    :class="{ unused: informationEndpointService.isUnusedOutputObject(application.id, informationObject.informationObject.id) }"
                    :title="informationEndpointService.isUnusedOutputObject(application.id, informationObject.informationObject.id)
                        ? 'Not used by any other resource'
                        : undefined"
                >
                    <span
                        v-if="informationObject.position > 0"
                        class="source-indicator"
                    >↳</span>

                    <span class="field-name">
                        {{ informationObject.informationObject.objectName }}
                    </span>

                    <button
                        class="delete-button"
                        type="button"
                        title="Delete information object"
                        @click="deleteInformationObject(
                            application.id,
                            informationObject.informationObject.id,
                            'output'
                        )"
                    >
                        ×
                    </button>
                </div>

                <div class="add-information-object">
                    <Select
                        v-model="forwardedInformationObject"
                        :options="application.inputInformationObjects.map(inputInformationObject => inputInformationObject.informationObject)"
                        option-label="objectName"
                        :option-disabled="(informationObject: ResolvedInformationObject) =>
                            application!.outputInformationObjects.some(
                                existing => existing.informationObject.id === informationObject.id
                            )"
                        placeholder="+ Add forwarded object"
                        filter
                        filter-placeholder="Search object"
                        empty-message="No input objects to forward"
                        size="small"
                        class="searchable-select"
                        @change="addForwardedInformationObject(application.id)"
                    />

                    <div class="or-divider">
                        <span>or</span>
                    </div>

                    <div class="new-field-row">
                        <input
                            v-model="newOutputInformationObjectName"
                            type="text"
                            placeholder="+ New information object"
                            @keyup.enter="
                                newInformationObject(
                                    application.id,
                                    'output'
                                )
                            "
                        />
                    </div>
                </div>
            </div>

            <!-- Forwarded -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Forwarded fields</span>
                </div>

                <div
                    v-for="field in forwardedOutputFields"
                    :key="field.informationField.id"
                    class="field-row"
                    :class="{ unused: informationEndpointService.isUnusedOutputField(application.id, field.informationField.id) }"
                    :title="informationEndpointService.isUnusedOutputField(application.id, field.informationField.id)
                        ? 'Not used by any other resource'
                        : undefined"
                >
                    <span class="source-indicator">↳</span>

                    <span class="field-name">
                        {{ field.informationField.fieldName }}
                    </span>

                    <button
                        class="delete-button"
                        @click="deleteInformationField(
                            application.id,
                            field.informationField.id,
                            'output'
                        )"
                    >
                        ×
                    </button>
                </div>

                <Select
                    v-model="forwardedInformationField"
                    :options="application.inputInformationFields.map(inputInformationField => inputInformationField.informationField)"
                    option-label="fieldName"
                    :option-disabled="(field: InformationField) =>
                        application!.outputInformationFields.some(
                            existing => existing.informationField.id === field.id
                        )"
                    placeholder="+ Add forwarded field"
                    filter
                    filter-placeholder="Search field"
                    empty-message="No input fields to forward"
                    size="small"
                    class="searchable-select"
                    @change="addForwardedInformationField(application.id)"
                />
            </div>

            <!-- Local output -->
            <div class="subsection">
                <div class="subsection-title">
                    <span>Output fields</span>
                </div>

                <div
                    v-for="field in localOutputFields"
                    :key="field.informationField.id"
                    class="field-row"
                    :class="{ unused: informationEndpointService.isUnusedOutputField(application.id, field.informationField.id) }"
                    :title="informationEndpointService.isUnusedOutputField(application.id, field.informationField.id)
                        ? 'Not used by any other resource'
                        : undefined"
                >
                    <span class="field-name">
                        {{ field.informationField.fieldName }}
                    </span>

                    <button
                        class="delete-button"
                        @click="deleteInformationField(
                            application.id,
                            field.informationField.id,
                            'output'
                        )"
                    >
                        ×
                    </button>
                </div>

                <div class="new-field-row">
                    <input
                        v-model="newOutputInformationFieldName"
                        type="text"
                        placeholder="+ New output field"
                        @keyup.enter="
                            newInformationField(application.id, 'output')
                        "
                    />

                    <button
                        v-if="newOutputInformationFieldName.trim()"
                        @click="
                            newInformationField(application.id, 'output')
                        "
                    >
                        Add
                    </button>
                </div>
            </div>
        </section>

        <!-- Endpoints: where the information of this application is used by people -->
        <EndpointsSection
            :resource-id="application.id"
            resource-type="application"
        />
    </div>
</template>

<style scoped>
.application-detail {
    width: 100%;
    box-sizing: border-box;

    color: #1e293b;
    font-size: 12px;
}


/* Header */

.application-header {
    display: flex;
    align-items: center;
    gap: 10px;

    padding: 14px 16px 12px;
}

.header-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 32px;
    height: 32px;
    border-radius: 8px;

    background: #eff6ff;
    color: #3b82f6;
    font-size: 14px;
}

.header-text {
    flex: 1;
    min-width: 0;
}

.application-header h2 {
    margin: 1px 0 0;
    overflow: hidden;

    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.type-label {
    color: #94a3b8;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.version {
    display: flex;
    align-items: center;
    gap: 3px;

    color: #94a3b8;
    font-size: 11px;
}

.version input {
    width: 52px;
    height: 24px;
    box-sizing: border-box;
    padding: 0 6px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    outline: none;

    color: #1e293b;
    font: inherit;
}

.version input:focus {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}


/* Main information sections */

.information-section {
    margin: 0 12px 10px;
    padding: 10px 10px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;

    color: #475569;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.field-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #f1f5f9;
    color: #64748b;
    font-size: 10px;
    letter-spacing: normal;
    line-height: 16px;
}


/* Subsections */

.subsection {
    margin: 4px 0 8px;
}

.subsection + .subsection {
    padding-top: 6px;
    border-top: 1px dashed #eef2f7;
}

.subsection-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 20px;

    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
}


/* Fields */

.field-row,
.information-object-field {
    display: flex;
    align-items: center;
    gap: 4px;

    min-height: 24px;
    padding: 0 2px 0 6px;
    border-radius: 6px;

    transition: background 0.1s ease;
}

.field-row:hover,
.information-object-field:hover {
    background: #f1f5f9;
}

.field-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
}

/* Outputs that are not used by any other resource */
.field-row.unused {
    background: #fef2f2;
    color: #b91c1c;
}

.field-row.unused:hover {
    background: #fee2e2;
}

.field-row.unused .source-indicator {
    color: #ef4444;
}

/* Inputs that come from another application without an api url that sends them */
.field-row.not-sent {
    background: #fffbeb;
    color: #b45309;
}

.field-row.not-sent:hover {
    background: #fef3c7;
}

.field-row.not-sent .source-indicator {
    color: #f59e0b;
}

.information-object.not-sent {
    border-color: #fcd34d;
    background: #fffbeb;
}

.information-object.not-sent .information-object-row .field-name {
    color: #b45309;
}

.source-indicator {
    width: 14px;
    color: #94a3b8;
}

.delete-button,
.icon-button {
    border: 0;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
}

.delete-button {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 5px;

    font-size: 13px;
    line-height: 1;

    opacity: 0;
    transition: opacity 0.1s ease, background 0.1s ease, color 0.1s ease;
}

.field-row:hover .delete-button,
.information-object-row:hover .delete-button,
.information-object-field:hover .delete-button {
    opacity: 1;
}

.delete-button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.icon-button {
    font-size: 15px;
}


/* Information objects */

.information-object {
    margin-bottom: 4px;

    border: 1px solid #e0e7ff;
    border-radius: 8px;
    background: #f8faff;
}

.information-object-row {
    display: flex;
    align-items: center;
    gap: 5px;

    min-height: 26px;
    padding: 0 2px 0 6px;
    border-radius: 8px;
    cursor: pointer;

    transition: background 0.1s ease;
}

.information-object-row:hover {
    background: #eef2ff;
}

.information-object-row .field-name {
    color: #3730a3;
    font-weight: 600;
}

.expand-icon {
    color: #6366f1;
    font-size: 9px;

    transition: transform 0.15s ease;
}

.expand-icon.expanded {
    transform: rotate(90deg);
}

.object-icon {
    color: #6366f1;
}

.object-field-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #e0e7ff;
    color: #4f46e5;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
}

.information-object-fields {
    margin: 0 6px 6px 16px;
    padding-left: 8px;
    border-left: 1px solid #c7d2fe;
}

.empty-object {
    padding: 3px 6px;

    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
}


/* Adding information */

.inline-select,
.new-field-row input {
    width: 100%;
    height: 28px;
    box-sizing: border-box;

    border: 1px dashed #e2e8f0;
    border-radius: 6px;
    outline: none;
    background: transparent;

    color: #64748b;
    font: inherit;

    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.inline-select:hover,
.new-field-row input:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
}

.new-field-row input:focus {
    border-style: solid;
    border-color: #a5b4fc;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    color: #1e293b;
}

.inline-select {
    padding: 0 6px;
    cursor: pointer;
}

.new-field-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
}

.new-field-row input {
    padding: 0 8px;
}

.new-field-row button {
    flex: 0 0 auto;
    height: 28px;
    padding: 0 10px;

    border: 0;
    border-radius: 6px;
    background: #4f46e5;

    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}

.new-field-row button:hover {
    background: #4338ca;
}

.or-divider {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0;

    color: #cbd5e1;
    font-size: 10px;
}

.or-divider::before,
.or-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #eef2f7;
}

.empty-row {
    padding: 3px 6px;

    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
}

.add-information-object {
    margin-top: 4px;
}


/* Compact PrimeVue selects, styled like the other add inputs */

.searchable-select {
    width: 100%;
    margin-top: 4px;
}

.searchable-select.p-select {
    height: 28px;

    border: 1px dashed #e2e8f0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none;

    transition: border-color 0.15s ease, background 0.15s ease;
}

.searchable-select:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
}

.searchable-select :deep(.p-select-label) {
    padding: 0 8px;

    color: #64748b;
    font-size: 12px;
    line-height: 26px;
}

.searchable-select :deep(.p-select-dropdown) {
    width: 26px;
    color: #94a3b8;
}

.searchable-select :deep(.p-select-dropdown .p-icon) {
    width: 10px;
    height: 10px;
}

.object-field-select {
    height: 26px;
    margin-top: 3px;
    font-size: 11px;
}

.information-object-fields .new-field-row input {
    height: 26px;
    font-size: 11px;
}

.information-object-fields .new-field-row button {
    height: 25px;
}

.information-object-fields .or-divider {
    margin: 2px 0;
}


/* Properties */

.website-link {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 28px;
    height: 28px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;

    color: #4f46e5;
    font-size: 11px;
    text-decoration: none;
}

.website-link:hover {
    border-color: #a5b4fc;
    background: #eef2ff;
}

/* APIs */

.section-chevron {
    color: #94a3b8;
    font-size: 9px;

    transition: transform 0.15s ease;
}

.section-chevron.expanded {
    transform: rotate(90deg);
}

.unused-api-count {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
    padding: 0 6px;
    border-radius: 999px;

    background: #fef3c7;
    color: #b45309;
    font-size: 10px;
    letter-spacing: normal;
    line-height: 16px;
    text-transform: none;
}

.unused-api-count .pi {
    font-size: 9px;
}

.api-card.unused {
    border-color: #fcd34d;
    background: #fffbeb;
}

.api-unused-badge {
    padding: 0 6px;
    border-radius: 999px;

    background: #fef3c7;
    color: #b45309;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
}

.api-card {
    margin: 6px 0 8px;
    padding: 8px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
}

.api-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.api-header + * {
    margin-top: 6px;
}

.api-icon {
    color: #94a3b8;
    font-size: 11px;
}

.api-url {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.api-auth-badge {
    padding: 0 6px;
    border-radius: 999px;

    background: #fef3c7;
    color: #b45309;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
}

.api-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
}

.api-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    padding: 1px 3px 1px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;

    background: #ffffff;
    font-size: 11px;
}

.api-chip.object {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.api-chip-object {
    color: #4f46e5;
    font-size: 10px;
}

.api-chip button {
    width: 16px;
    height: 16px;
    padding: 0;

    border: 0;
    border-radius: 50%;
    background: transparent;

    color: #94a3b8;
    cursor: pointer;
}

.api-chip button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.api-add-row {
    display: flex;
    flex-direction: column;
}

.api-card .searchable-select.p-select {
    background: #ffffff;
}
</style>
