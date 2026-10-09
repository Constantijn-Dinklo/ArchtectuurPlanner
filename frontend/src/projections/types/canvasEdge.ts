

import type { OtherConnectionMethod } from "../../stores/otherConnection.store";

export interface CanvasEdge {
    id: string;
    type: 'connection';

    source: string;
    target: string;

    data: {
        apiIds: string[];
        databaseConnectionIds: string[];
        scriptIds: string[];
        // Connections that are not an api, database connection or script: by hand, a send button, a file, ...
        otherConnectionIds: string[];
        otherConnectionMethods: OtherConnectionMethod[];

        sourceResourceId: string;
        targetResourceId: string;

        // Problems with the information transfer over this edge, shown as a yellow warning
        warnings: string[];
    };

    label?: string;

    zIndex: number;
}
