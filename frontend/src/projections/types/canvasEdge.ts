

export interface CanvasEdge {
    id: string;
    type: 'connection';

    source: string;
    target: string;

    data: {
        apiIds: string[];
        databaseConnectionIds: string[];
        scriptIds: string[];
        // Connections where a person manually enters the information into the target
        humanConnectionIds: string[];

        sourceResourceId: string;
        targetResourceId: string;

        // Problems with the information transfer over this edge, shown as a yellow warning
        warnings: string[];
    };

    label?: string;

    zIndex: number;
}
