import { useUIStore } from "../stores/canvas/ui.store";
import { useComponentStore } from "../stores/resources/component.store";
import { getComponentDisplay } from "../types/component.types";
import { isResourceTypeVisible } from "../types/levelOfDetail";

// Where the end of a connection is drawn on the canvas: at the closest level that is visible. A script is a row with
// handles of its own while components are shown, otherwise it is drawn at its host. A table never has edges of its
// own: they always go to its database
export function useCanvasEndService() {
    const UIStore = useUIStore();
    const componentStore = useComponentStore();

    function getVisibleEndId(partId: string): string {
        const component = componentStore.getComponent(partId);
        if (!component) return partId;
        const hasOwnEdges = getComponentDisplay(component) === 'row' && isResourceTypeVisible(UIStore.levelOfDetail, 'component');
        return hasOwnEdges ? partId : component.resourceId;
    }

    return { getVisibleEndId };
}
