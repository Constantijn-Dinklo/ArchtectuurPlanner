<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Every route with a label in its meta gets an item in the rail
const items = computed(() =>
    router.getRoutes()
        .filter(route => route.meta.label)
        .map(route => ({
            path: route.path,
            label: route.meta.label as string,
            icon: route.meta.icon as string
        }))
);
</script>

<!-- A small rail that expands over the content when hovered -->
<template>
    <nav class="navigation-rail">
        <div class="rail-logo">
            <span class="rail-logo-mark">A</span>
            <span class="rail-label rail-logo-text">Architectuur Planner</span>
        </div>

        <RouterLink
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            class="rail-item"
            active-class="active"
            :title="item.label"
        >
            <i :class="item.icon" class="rail-icon" />
            <span class="rail-label">{{ item.label }}</span>
        </RouterLink>
    </nav>
</template>

<style scoped>
.navigation-rail {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 20;

    display: flex;
    flex-direction: column;
    gap: 4px;

    width: 52px;
    box-sizing: border-box;
    padding: 10px 8px;
    overflow: hidden;

    border-right: 1px solid #1e293b;
    background: #0f172a;

    transition: width 0.18s ease, box-shadow 0.18s ease;
}

.navigation-rail:hover {
    width: 200px;
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.25);
}

.rail-logo {
    display: flex;
    align-items: center;
    gap: 10px;

    height: 36px;
    margin-bottom: 10px;
    padding-left: 2px;
}

.rail-logo-mark {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 32px;
    height: 32px;
    border-radius: 8px;

    background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
}

.rail-logo-text {
    color: #f8fafc;
    font-size: 13px;
    font-weight: 600;
}

.rail-item {
    display: flex;
    align-items: center;
    gap: 12px;

    width: 100%;
    height: 36px;
    padding: 0 10px;

    border: 0;
    border-radius: 8px;
    background: transparent;

    color: #94a3b8;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    text-decoration: none;
    box-sizing: border-box;
    cursor: pointer;

    transition: background 0.15s ease, color 0.15s ease;
}

.rail-item:hover {
    background: #1e293b;
    color: #f8fafc;
}

.rail-item.active {
    background: #312e81;
    color: #ffffff;
}

.rail-icon {
    flex: 0 0 auto;
    width: 16px;
    font-size: 15px;
    text-align: center;
}

.rail-label {
    overflow: hidden;
    white-space: nowrap;

    opacity: 0;
    transition: opacity 0.12s ease;
}

.navigation-rail:hover .rail-label {
    opacity: 1;
}
</style>
