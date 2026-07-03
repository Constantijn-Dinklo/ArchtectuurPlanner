
export type NodeType = 'application' | 'database' | 'fileLocation' | 'server';

export interface CanvasNode {
  id: string;
  
  data: {
    label: string;
    type: NodeType | 'unknown'; //Change to 'type' when rendering each type seperately
  }

  parentNode?: string;
  extent?: string;

  position: {
    x: number;
    y: number;
  };
  style?: any;
  class?: string;
}