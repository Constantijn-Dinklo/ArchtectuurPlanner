import { defineStore } from "pinia";

type NodeType = 'application' | 'database';

export interface CanvasNode {
  id: string;
  
  label: string;
  resourceType: NodeType; //Change to 'type' when rendering each type seperately

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
    databaseEdges: [] as CanvasEdge[],
    scriptEdges: new Map<string, CanvasEdge[]>() // {scriptId: [edges]}
  }),

  actions: {
    addNode(id: string, label: string, type: NodeType) {
      this.nodes.push({
        id: id, //Give unique ID? Problem is that edges are connected based on this id, so database needs to know about this ID then.
        label: label,
        resourceType: type,
        position: {
            x: Math.random() * 400,
            y: Math.random() * 400
        }
      });
    },

    addApplicationNode(applicationId: string, label: string) {
      this.addNode(applicationId, label, 'application');
    },

    addDatabaseNode(databaseId: string, label: string) {
      this.addNode(databaseId, label, 'database');
    },

    removeNode(id: string){
      this.nodes = this.nodes.filter((node) => node.id !== id);
    },


    addApiEdge(edge: CanvasEdge) {
      this.apiEdges.push(edge);
    },

    updateApiEdge(id: string, updatedEdge: CanvasEdge) {
      if(updatedEdge.source === '' || updatedEdge.target === '') return;

      this.apiEdges = this.apiEdges.filter(e => e.id !== id);
      this.apiEdges.push(updatedEdge);
    },

    removeApiEdge(id: string) {
      this.apiEdges = this.apiEdges.filter((apiEdge) => apiEdge.id !== id);
    },

    addDatabaseEdge(edge: CanvasEdge) {
      this.databaseEdges.push(edge);
    },

    updateDatabaseEdge(id: string, updatedEdge: CanvasEdge) {
      if(updatedEdge.source === '' || updatedEdge.target === '') return;

      this.databaseEdges = this.databaseEdges.filter(e => e.id !== id);
      this.databaseEdges.push(updatedEdge);
    },

    removeDatabaseEdge(id: string){
      this.databaseEdges = this.databaseEdges.filter((databaseEdge) => databaseEdge.id !== id);
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
        ...state.databaseEdges,
        ...Array.from(this.scriptEdges.values()).flat()
      ];
    }
  }
});