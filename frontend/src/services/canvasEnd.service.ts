import { useUIStore } from "../stores/canvas/ui.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { getComponentDisplay } from "../types/component.types";
import type { Connection } from "../types/connection.types";
import { isResourceTypeVisible } from "../types/levelOfDetail";

// Where the end of a connection is drawn on the canvas: at the closest level that is visible. A script or file is a
// row with handles of its own while components are shown, otherwise it is drawn at its resource. A table never has
// edges of its own: they always go to its database
export function useCanvasEndService() {
    const UIStore = useUIStore();
    const componentStore = useComponentStore();
    const informationRelationStore = useInformationRelationStore();

    function getVisibleEndId(partId: string): string {
        const component = componentStore.getComponent(partId);
        if (!component) return partId;
        const hasOwnEdges = getComponentDisplay(component) === 'row' && isResourceTypeVisible(UIStore.levelOfDetail, 'component');
        return hasOwnEdges ? partId : component.resourceId;
    }

    // The [source, target] pairs a connection is drawn between. The relations through it can end inside its ends (a
    // file in a file location): each is drawn at the visible ends of its relation, so a write to a file goes to the
    // file while files are shown. A connection without relations is drawn at its own ends
    function getDrawnEnds(connection: Connection): [string, string][] {
        const relations = [...informationRelationStore.fieldRelations, ...informationRelationStore.objectRelations]
            .filter(relation => relation.connectionId === connection.id);
        const pairs = relations.length
            ? relations.map(relation => [getVisibleEndId(relation.sourceResourceId), getVisibleEndId(relation.targetResourceId)])
            : [[getVisibleEndId(connection.source.id), getVisibleEndId(connection.target.id)]];
        const unique = new Map(pairs.map(([sourceId, targetId]) => [`${sourceId}>${targetId}`, [sourceId, targetId] as [string, string]]));
        return [...unique.values()];
    }

    return { getVisibleEndId, getDrawnEnds };
}
