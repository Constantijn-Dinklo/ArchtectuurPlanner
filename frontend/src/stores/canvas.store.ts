import { defineStore } from "pinia";

export interface CanvasNode {
  id: string;
  label: string;

  position: {
    x: number;
    y: number;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export const useCanvasStore = defineStore("canvas", {
  state: () => ({
    nodes: [] as CanvasNode[],
    edges: [] as CanvasEdge[],
  }),

  actions: {
    addNode(node: CanvasNode) {
      this.nodes.push(node);
    },

    addEdge(edge: CanvasEdge) {
      this.edges.push(edge);
    },

    removeNode(nodeId: string) {
      this.nodes = this.nodes.filter((n) => n.id !== nodeId);

      this.edges = this.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );
    },
  },
});