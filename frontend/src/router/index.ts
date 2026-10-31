import { createRouter, createWebHistory } from 'vue-router';

import ArchitectureView from '../components/architecture/ArchitectureView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/architecture'
        },
        {
            path: '/architecture',
            name: 'architecture',
            component: ArchitectureView,
            meta: { label: 'Architecture', icon: 'pi pi-sitemap' }
        },
        {
            path: '/data-catalogue',
            name: 'dataCatalogue',
            // Loaded when it is opened for the first time
            component: () => import('../components/dataCatalogue/DataCatalogueView.vue'),
            meta: { label: 'Data catalogue', icon: 'pi pi-book' }
        },
        {
            path: '/management',
            name: 'management',
            // Loaded when it is opened for the first time
            component: () => import('../components/management/ManagementView.vue'),
            meta: { label: 'Management', icon: 'pi pi-briefcase' }
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/architecture'
        }
    ]
});

export default router;
