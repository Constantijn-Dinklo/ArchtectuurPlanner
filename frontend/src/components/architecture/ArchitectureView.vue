<script setup lang="ts">
import LeftSidebar from '../layout/LeftSidebar.vue';
import CenterContent from '../layout/CenterContent.vue';
import RightSidebar from '../layout/RightSidebar.vue';
</script>

<!-- The architecture environment: resources, canvas and details -->
<template>
    <div class="architecture-layout">
        <div class="left-sidebar">
            <LeftSidebar />
        </div>
        <div class="center-content">
            <CenterContent />
        </div>
        <div class="right-sidebar">
            <RightSidebar />
        </div>
    </div>
</template>

<style scoped>
.architecture-layout {
    display: grid;

    grid-template-columns:
        250px
        1fr
        500px;

    height: 100%;
}

.left-sidebar {
    border-right: 1px solid #ddd;

    overflow: auto;
}

.center-content {
    overflow: hidden;
}

.right-sidebar {
    border-left: 1px solid #ddd;

    overflow: auto;
}
</style>
