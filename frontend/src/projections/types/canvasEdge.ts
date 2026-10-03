

export interface CanvasEdge {
    id: string;
    type: 'connection';

    source: string;
    target: string;

    data: {
        apiIds: string[];
        databaseConnectionIds: string[];
        scriptIds: string[];

        sourceResourceId: string;
        targetResourceId: string;

        // Problems with the information transfer over this edge, shown as a yellow warning
        warnings: string[];
    };

    label?: string;

    zIndex: number;
}
