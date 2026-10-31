<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';
    import { useDataCatalogueService } from '../../services/dataCatalogue.service';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import DataCatalogueCard from './DataCatalogueCard.vue';

    // An overview of all information in the environment, with the chains it takes through the architecture
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const dataCatalogueService = useDataCatalogueService();

    const isLoading = ref(true);
    const loadError = ref('');

    onMounted(async () => {
        try {
            await dataCatalogueService.fetchDataCatalogue();
        }
        catch (error: any) {
            // A route that is missing answers without an error of our own: the status then says what went wrong
            loadError.value = error.response?.data?.error ?? `Could not load the data catalogue (${error.message})`;
        }
        finally {
            isLoading.value = false;
        }
    });

    const sections = computed(() => [
        {
            kind: 'object' as const,
            title: 'Information objects',
            empty: 'No information objects yet',
            items: [...informationObjectStore.informationObjects.values()]
                .map(informationObject => ({ id: informationObject.id, name: informationObject.objectName }))
                .sort((a, b) => a.name.localeCompare(b.name))
        },
        {
            kind: 'field' as const,
            title: 'Information fields',
            empty: 'No information fields yet',
            items: [...informationFieldStore.informationFields.values()]
                .map(field => ({ id: field.id, name: field.fieldName }))
                .sort((a, b) => a.name.localeCompare(b.name))
        }
    ]);
</script>

<template>
    <div class="data-catalogue-view">
        <div class="data-catalogue-content">
            <header class="data-catalogue-header">
                <h1>Data catalogue</h1>
                <p>All information in this environment, and the route it takes through the architecture.</p>
            </header>

            <div v-if="isLoading" class="data-catalogue-message">
                <i class="pi pi-spin pi-spinner" />
                Loading the data catalogue…
            </div>

            <div v-else-if="loadError" class="data-catalogue-message error">
                <i class="pi pi-exclamation-triangle" />
                {{ loadError }}
            </div>

            <template v-else>
                <section v-for="section in sections" :key="section.kind" class="data-catalogue-section">
                    <h2>
                        {{ section.title }}
                        <span class="section-count">{{ section.items.length }}</span>
                    </h2>

                    <div v-if="!section.items.length" class="data-catalogue-message">{{ section.empty }}</div>

                    <div class="data-catalogue-cards">
                        <DataCatalogueCard
                            v-for="item in section.items"
                            :key="item.id"
                            :kind="section.kind"
                            :information-id="item.id"
                            :name="item.name"
                        />
                    </div>
                </section>
            </template>
        </div>
    </div>
</template>

<style scoped>
.data-catalogue-view {
    height: 100%;
    overflow-y: auto;
    background: #f8fafc;
}

.data-catalogue-content {
    box-sizing: border-box;
    max-width: 960px;
    margin: 0 auto;
    padding: 28px 24px 40px;

    color: #1e293b;
    font-size: 13px;
}

.data-catalogue-header {
    margin-bottom: 20px;
}

.data-catalogue-header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.data-catalogue-header p {
    margin: 4px 0 0;
    color: #64748b;
}

.data-catalogue-section {
    margin-bottom: 24px;
}

.data-catalogue-section h2 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 8px;

    color: #475569;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.section-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #e2e8f0;
    color: #64748b;
    font-size: 10px;
    letter-spacing: normal;
    line-height: 16px;
}

.data-catalogue-cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.data-catalogue-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;

    color: #64748b;
}

.data-catalogue-message.error {
    color: #b91c1c;
}
</style>
