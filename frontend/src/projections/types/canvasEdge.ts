

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
        // Script components (scripts inside an application or file location) over this edge
        componentScriptIds: string[];
        // Not a connection but membership: the component at the end is part of the resource at the start
        partOf: boolean;

        sourceResourceId: string;
        targetResourceId: string;

        // Problems with the information transfer over this edge, shown as a yellow warning
        warnings: string[];
        // Information moves over this edge without any connection, shown in red
        hasError: boolean;
    };

    label?: string;

    zIndex: number;
}
