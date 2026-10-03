<!-- The management environment (beheer omgeving). Still empty for now -->
<template>
    <div class="management-view">
        <div class="construction-card">
            <span class="construction-icon">
                <i class="pi pi-wrench" />
            </span>

            <h1>Building in progress</h1>
            <p>The management environment is still under construction.</p>
        </div>
    </div>
</template>

<style scoped>
.management-view {
    display: flex;
    align-items: center;
    justify-content: center;

    height: 100%;
    background: #f8fafc;
}

.construction-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;

    max-width: 340px;
    padding: 36px 40px;

    border: 1px dashed #cbd5e1;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);

    text-align: center;
}

.construction-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 52px;
    height: 52px;
    margin-bottom: 8px;
    border-radius: 14px;

    background: repeating-linear-gradient(
        -45deg,
        #fde68a,
        #fde68a 8px,
        #fbbf24 8px,
        #fbbf24 16px
    );
    color: #78350f;
    font-size: 20px;
}

.construction-card h1 {
    margin: 0;

    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
}

.construction-card p {
    margin: 0;

    color: #64748b;
    font-size: 13px;
}
</style>
