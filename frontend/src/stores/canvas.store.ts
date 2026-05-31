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
    apiEdges: [] as CanvasEdge[],
    scriptEdges: new Map<string, CanvasEdge[]>() // {scriptId: [edges]}
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

    removeNodeApplicationId(applicationId: string){
      this.nodes = this.nodes.filter((node) => node.applicationId !== applicationId);
    },

    addApiEdge(edge: CanvasEdge) {
      this.apiEdges.push(edge);
    },

    updateApiEdge(id: string, updateEdge: CanvasEdge) {
      if(updateEdge.source === '' || updateEdge.target === '') return;

      const edge = this.apiEdges.find(e => e.id === id);
      if(edge) {
        Object.assign(edge, updateEdge);
      }
      else {
        this.apiEdges.push(updateEdge);
      }
    },

    removeApiEdge(id: string) {
      this.apiEdges = this.apiEdges.filter((apiEdge) => apiEdge.id !== id);
    },

    updateScriptEdges(scriptId: string, edges: CanvasEdge[]) {
      this.scriptEdges.set(scriptId, edges);
    },

    removeScriptEdges(scriptId: string) {
      this.scriptEdges.delete(scriptId);
    }
  },

  getters: {
    //Might be slow, but works for now
    allEdges(state): CanvasEdge[] {
      return [
        ...state.apiEdges,
        ...Array.from(this.scriptEdges.values()).flat()
      ];
    }
  }
});