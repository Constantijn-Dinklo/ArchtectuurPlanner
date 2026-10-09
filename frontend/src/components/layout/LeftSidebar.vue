<script setup lang="ts">
import ApplicationBar from '../ApplicationBar.vue';
import DatabaseBar from '../DatabaseBar.vue';
import FileLocation from '../FileLocationBar.vue'
import ServerBar from '../ServerBar.vue';
import ExternalBar from '../ExternalBar.vue';
</script>

<template>
    <div class="left-sidebar-content">
        <div class="sidebar-heading">Resources</div>

        <ApplicationBar />
        <DatabaseBar />
        <FileLocation />
        <ServerBar />
        <ExternalBar />
    </div>
</template>

<style scoped>
.left-sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 10px;

    min-height: 100%;
    padding: 14px 12px;
    box-sizing: border-box;

    background: #f8fafc;
}

.sidebar-heading {
    padding: 0 4px 2px;

    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}
</style>

<!-- Shared styling for the resource bars (ApplicationBar, DatabaseBar, FileLocationBar, ServerBar) -->
<style>
.sidebar-section {
    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

    color: #1e293b;
    font-size: 12px;
}

.sidebar-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;

    padding: 9px 12px;
    border: 0;
    background: transparent;

    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.sidebar-section-header:hover {
    background: #f8fafc;
}

.sidebar-section-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;

    width: 22px;
    height: 22px;
    border-radius: 6px;

    font-size: 11px;
}

.sidebar-section-icon.application { background: #eff6ff; color: #3b82f6; }
.sidebar-section-icon.database { background: #ecfdf3; color: #22a35a; }
.sidebar-section-icon.file-location { background: #fff7ed; color: #ea580c; }
.sidebar-section-icon.server { background: #fefce8; color: #ca8a04; }
.sidebar-section-icon.external { background: #f1f5f9; color: #475569; border: 1px dashed #94a3b8; box-sizing: border-box; }

.sidebar-section-title {
    flex: 1;
    font-weight: 600;
}

.sidebar-section-count {
    padding: 0 7px;
    border-radius: 999px;

    background: #f1f5f9;
    color: #64748b;
    font-size: 10px;
    font-weight: 600;
    line-height: 17px;
}

.sidebar-section-chevron {
    color: #94a3b8;
    font-size: 10px;

    transition: transform 0.15s ease;
}

.sidebar-section-chevron.expanded {
    transform: rotate(90deg);
}

.sidebar-section-body {
    padding: 0 8px 8px;
}

/* Add row */

.sidebar-add-row {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
}

.sidebar-input,
.sidebar-select {
    flex: 1;
    min-width: 0;
    height: 28px;
    box-sizing: border-box;
    padding: 0 9px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    outline: none;
    background: #ffffff;

    color: #1e293b;
    font: inherit;

    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.sidebar-input:focus,
.sidebar-select:focus {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.sidebar-add-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;

    width: 28px;
    height: 28px;

    border: 0;
    border-radius: 6px;
    background: #4f46e5;

    color: #ffffff;
    font-size: 11px;
    cursor: pointer;

    transition: background 0.15s ease, opacity 0.15s ease;
}

.sidebar-add-button:hover {
    background: #4338ca;
}

.sidebar-add-button:disabled {
    cursor: default;
    opacity: 0.4;
}

/* Items */

.sidebar-list,
.sidebar-sublist {
    margin: 0;
    padding: 0;
    list-style: none;
}

.sidebar-item {
    display: flex;
    align-items: center;
    gap: 6px;

    min-height: 28px;
    padding: 0 6px;
    border-radius: 6px;

    transition: background 0.1s ease;
}

.sidebar-item:hover {
    background: #f1f5f9;
}

.sidebar-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.sidebar-item-actions {
    display: flex;
    gap: 2px;

    opacity: 0;
    transition: opacity 0.1s ease;
}

.sidebar-item:hover .sidebar-item-actions,
.sidebar-item:focus-within .sidebar-item-actions {
    opacity: 1;
}

.sidebar-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 22px;
    height: 22px;
    padding: 0;

    border: 0;
    border-radius: 5px;
    background: transparent;

    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;

    transition: background 0.1s ease, color 0.1s ease;
}

.sidebar-icon-button:hover {
    background: #e2e8f0;
    color: #1e293b;
}

.sidebar-icon-button.danger:hover {
    background: #fee2e2;
    color: #dc2626;
}

.sidebar-sublist {
    margin: 0 0 4px 14px;
    padding-left: 8px;
    border-left: 1px solid #e2e8f0;
}

.sidebar-sublist .sidebar-item {
    min-height: 26px;
    font-size: 11px;
}

.sidebar-sublist .sidebar-input,
.sidebar-sublist .sidebar-select {
    height: 26px;
    font-size: 11px;
}

.sidebar-sub-icon {
    color: #94a3b8;
    font-size: 10px;
}

.sidebar-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    color: #64748b;
    font-size: 10px;
    cursor: pointer;
}

.sidebar-empty {
    padding: 6px;

    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
}
</style>
