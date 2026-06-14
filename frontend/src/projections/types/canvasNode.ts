
type NodeType = 'application' | 'database' | 'fileLocation';

export interface CanvasNode {
  id: string;
  
  data: {
    label: string;
    type: NodeType | 'unknown'; //Change to 'type' when rendering each type seperately
  }

  position: {
    x: number;
    y: number;
  };
  class?: string;
}