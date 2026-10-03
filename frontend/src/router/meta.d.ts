import 'vue-router';

export {};

// Routes with a label are shown in the NavigationRail
declare module 'vue-router' {
    interface RouteMeta {
        label?: string;
        icon?: string;
    }
}
