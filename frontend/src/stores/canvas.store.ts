import { defineStore } from "pinia";

export interface CanvasNode {
  id: string;
  applicationId: string;
  
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
    addNode(applicationId: string, label: string) {
      this.nodes.push({
        id: applicationId, //Give unique ID? Problem is that edges are connected based on this id, so database needs to know about this ID then.
        applicationId: applicationId,
        label: label,
        position: {
            x: Math.random() * 400,
            y: Math.random() * 400
        }
      });
    },

    addEdge(edge: CanvasEdge) {
      this.edges.push(edge);
    },

    updateEdge(id: string, updateEdge: CanvasEdge) {
      const edge = this.edges.find(e => e.id === id);
      if(!edge) return;
      Object.assign(edge, updateEdge);
    },

    removeNode(nodeId: string) {
      this.nodes = this.nodes.filter((n) => n.id !== nodeId);

      this.edges = this.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );
    },

    removeNodeApplicationId(applicationId: string){
      this.nodes = this.nodes.filter((node) => node.applicationId !== applicationId);
    }
  },
});