

export interface CanvasEdge {
    id: string;

    source: string;
    target: string;

    data: {
        apiIds: string[];
        databaseConnectionIds: string[];
        scriptIds: string[];
    };

    label?: string;

    zIndex: number;
}