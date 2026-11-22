import { useUIStore } from "../stores/canvas/ui.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useInformationRelationStore, type ResourceFieldRelation, type ResourceObjectRelation, type ResourceRelation } from "../stores/information/informationRelation.store";
import { getComponentDisplay } from "../types/component.types";
import type { Connection } from "../types/connection.types";
import { isResourceTypeVisible } from "../types/levelOfDetail";

// One piece of a connection as it is shown: per part inside its ends that the relations go to or come from (a file of
// the file location, a table of the database), drawn between the visible ends of those relations. A connection is
// stored once, but writing to two files of a file location shows as two
export interface ConnectionPiece {
    connection: Connection;
    // Where the piece is drawn
    sourceId: string;
    targetId: string;
    // The part inside an end of the connection; null for what goes between the connection's own ends, or a connection
    // that nothing goes through yet
    partId: string | null;
    relations: (ResourceFieldRelation | ResourceObjectRelation)[];
}

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

    // The part inside an end of the connection the relation goes to (target) or comes from (source)
    function getInnerPartId(connection: Connection, relation: ResourceRelation) {
        if (relation.targetResourceId !== connection.target.id) return relation.targetResourceId;
        if (relation.sourceResourceId !== connection.source.id) return relation.sourceResourceId;
        return null;
    }

    function getConnectionPieces(connection: Connection): ConnectionPiece[] {
        const relations = [...informationRelationStore.fieldRelations, ...informationRelationStore.objectRelations]
            .filter(relation => relation.connectionId === connection.id);
        if (!relations.length) {
            return [{ connection, sourceId: getVisibleEndId(connection.source.id), targetId: getVisibleEndId(connection.target.id), partId: null, relations: [] }];
        }

        const pieces = new Map<string, ConnectionPiece>();
        for (const relation of relations) {
            const sourceId = getVisibleEndId(relation.sourceResourceId);
            const targetId = getVisibleEndId(relation.targetResourceId);
            const partId = getInnerPartId(connection, relation);
            const key = `${sourceId}>${targetId}>${partId ?? ''}`;
            const piece = pieces.get(key) ?? { connection, sourceId, targetId, partId, relations: [] };
            piece.relations.push(relation);
            pieces.set(key, piece);
        }
        return [...pieces.values()];
    }

    return { getVisibleEndId, getConnectionPieces };
}
