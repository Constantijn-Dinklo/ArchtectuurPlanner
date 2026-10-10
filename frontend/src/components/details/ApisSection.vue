<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useApiStore, type Api } from '../../stores/api.store';
    import { useApiConnectionStore } from '../../stores/apiConnection.store';
    import { useSendableInformationService } from '../../services/sendableInformation.service';
    import CarriedInformationEditor from './CarriedInformationEditor.vue';

    // The api urls a resource (an application or an external element) offers, and what is sent through each of them.
    // Only what the resource passes on can be sent: the output of an application, what an external element provides
    const props = defineProps<{
        resourceId: string;
    }>();

    const apiStore = useApiStore();
    const apiConnectionStore = useApiConnectionStore();
    const sendableInformationService = useSendableInformationService();

    const apis = computed(() => apiStore.getApplicationApis(props.resourceId));

    // An api url that no api connection uses is shown in a warning colour
    function isApiUsed(apiId: string) {
        return apiConnectionStore.apiConnections.some(connection => connection.sourceUrlId === apiId);
    }

    const unusedApiCount = computed(() => apis.value.filter(api => !isApiUsed(api.id)).length);

    // Counts only what the resource can still pass on
    function getSentCount(api: Api) {
        const fieldIds = new Set(sendableInformationService.getSendableFields(props.resourceId).map(field => field.id));
        const objectIds = new Set(sendableInformationService.getSendableObjects(props.resourceId).map(object => object.id));
        return (api.informationFieldIds ?? []).filter(id => fieldIds.has(id)).length
            + (api.informationObjectIds ?? []).filter(id => objectIds.has(id)).length;
    }

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

    async function addApi() {
        const url = newApiUrl.value.trim();
        if (!url) return;
        await apiStore.commitApi(props.resourceId, url);
        newApiUrl.value = '';
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>APIs</span>
            <span class="detail-count">{{ apis.length }}</span>

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
            v-if="!apis.length"
            class="detail-empty"
        >
            No APIs yet. Add the urls offered here below.
        </div>

        <div
            v-for="api in apis"
            :key="api.id"
            class="api-card"
            :class="{ unused: !isApiUsed(api.id) }"
        >
            <div
                class="api-header"
                @click="toggleApi(api.id)"
            >
                <i
                    class="pi pi-chevron-right api-chevron"
                    :class="{ expanded: expandedApis.has(api.id) }"
                />
                <i class="pi pi-globe api-icon" />

                <span class="api-url" :title="api.url">
                    {{ api.url }}
                </span>

                <span
                    v-if="api.hasAuthentication"
                    class="api-auth-badge"
                >
                    Auth
                </span>

                <span
                    v-if="!isApiUsed(api.id)"
                    class="api-unused-badge"
                    title="No API connection uses this url"
                >
                    Not used
                </span>

                <span
                    class="detail-count"
                    title="Information objects and fields sent through this API"
                >
                    {{ getSentCount(api) }} sent
                </span>
            </div>

            <div
                v-if="expandedApis.has(api.id)"
                class="api-body"
            >
                <CarriedInformationEditor
                    :source-id="resourceId"
                    :information-field-ids="api.informationFieldIds ?? []"
                    :information-object-ids="api.informationObjectIds ?? []"
                    @add-field="id => apiStore.addInformationField(api.id, id)"
                    @remove-field="id => apiStore.removeInformationField(api.id, id)"
                    @add-object="id => apiStore.addInformationObject(api.id, id)"
                    @remove-object="id => apiStore.removeInformationObject(api.id, id)"
                />

                <div class="api-footer">
                    <label class="api-auth" title="Requires authentication">
                        <input
                            v-model="api.hasAuthentication"
                            type="checkbox"
                            @change="apiStore.updateApi(api.id, api)"
                        />
                        Requires authentication
                    </label>

                    <button
                        type="button"
                        class="api-delete"
                        title="Delete API url"
                        @click="apiStore.deleteApi(api.id)"
                    >
                        <i class="pi pi-trash" />
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <div class="detail-add-row">
            <input
                v-model="newApiUrl"
                type="text"
                class="detail-input"
                placeholder="+ New API url"
                @keyup.enter="addApi"
            />
            <button
                type="button"
                class="detail-add-button"
                title="Add API url"
                :disabled="!newApiUrl.trim()"
                @click="addApi"
            >
                <i class="pi pi-plus" />
            </button>
        </div>
    </section>
</template>

<style scoped>
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

.api-card {
    margin: 6px 0 8px;
    padding: 8px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
}

.api-card.unused {
    border-color: #fcd34d;
    background: #fffbeb;
}

.api-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.api-chevron {
    color: #94a3b8;
    font-size: 9px;

    transition: transform 0.15s ease;
}

.api-chevron.expanded {
    transform: rotate(90deg);
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

.api-auth-badge,
.api-unused-badge {
    padding: 0 6px;
    border-radius: 999px;

    background: #fef3c7;
    color: #b45309;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
}

.api-body {
    margin-top: 6px;
}

/* The editor indents itself for use under a row; inside a card that is not needed */
.api-body :deep(.carried-information) {
    padding: 0;
}

.api-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
    padding-top: 6px;

    border-top: 1px dashed #e2e8f0;
}

.api-auth {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    color: #64748b;
    font-size: 11px;
    cursor: pointer;
}

.api-delete {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 7px;

    border: 1px solid #e2e8f0;
    border-radius: 5px;
    background: #ffffff;

    color: #64748b;
    font-size: 11px;
    cursor: pointer;
}

.api-delete:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.api-delete .pi {
    font-size: 10px;
}
</style>
