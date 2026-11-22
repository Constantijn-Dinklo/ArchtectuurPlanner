import { useComponentStore } from "../stores/resources/component.store";
import { useResourceService } from "./resources/resource.service";
import { getComponentIcon, KINDS_CONNECTED_THROUGH_RESOURCE } from "../types/component.types";
import { RESOURCE_ICONS } from "../types/resource.type";

// A part is anything a connection or relation can end at: a resource, or a component inside one (a script, a table,
// a file)
export interface PartInfo {
    id: string;
    name: string;
    type: string;
    icon: string;
    // For a component: the resource it is part of
    hostId?: string;
}

export function usePartService() {
    const resourceService = useResourceService();
    const componentStore = useComponentStore();

    function getPart(id: string): PartInfo | undefined {
        const resource = resourceService.getResource(id);
        if (resource) return { id, name: resource.name, type: resource.type, icon: RESOURCE_ICONS[resource.type] };
        const component = componentStore.getComponent(id);
        if (component) return { id, name: component.name, type: component.kind, icon: getComponentIcon(component), hostId: component.resourceId };
        return undefined;
    }

    // E.g. "Webshop", or "Nightly import (on Webshop)"
    function getPartLabel(id: string) {
        const part = getPart(id);
        if (!part) return 'Unknown';
        if (part.type !== 'script' || !part.hostId) return part.name;
        return `${part.name} (on ${resourceService.getResource(part.hostId)?.name ?? '?'})`;
    }

    // The resource a table or file is reached through (its database or file location), or undefined for any other part
    function getContainerId(id: string) {
        const component = componentStore.getComponent(id);
        return component && KINDS_CONNECTED_THROUGH_RESOURCE.includes(component.kind) ? component.resourceId : undefined;
    }

    // A part and the part it is inside of. A connection end holds a relation end when it is one of these
    function getHolderIds(id: string) {
        const containerId = getContainerId(id);
        return containerId ? [id, containerId] : [id];
    }

    // The scripts, which can be connected like an application
    function getScripts() {
        return componentStore.components.filter(component => component.kind === 'script');
    }

    return { getPart, getPartLabel, getContainerId, getHolderIds, getScripts };
}
