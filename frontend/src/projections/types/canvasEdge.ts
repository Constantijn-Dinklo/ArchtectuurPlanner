import type { ConnectionKind } from "../../types/connection.types";

export interface CanvasEdge {
    id: string;
    type: 'connection';

    source: string;
    target: string;
    // Set when the edge starts or ends at a component row inside a node
    sourceHandle?: string;
    targetHandle?: string;

    data: {
        // The connections over this edge, and their kinds (for the icons)
        connectionIds: string[];
        connectionKinds: ConnectionKind[];
        // Scripts (inside an application or file location) over this edge
        scriptIds: string[];

        sourceResourceId: string;
        targetResourceId: string;

        // Problems or gaps in the information transfer over this edge, shown as a yellow warning
        warnings: string[];
        // Something is wrong over this edge, shown in red
        hasError: boolean;
    };

    label?: string;

    zIndex: number;
}
