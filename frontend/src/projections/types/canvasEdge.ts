

export interface CanvasEdge {
    id: string;

    source: string;
    target: string;

    apiIds: string[];
    databaseConnectionIds: string[];
    scriptIds: string[];

    label?: string;
}