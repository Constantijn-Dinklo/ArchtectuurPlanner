import type { CoordinateExtent, CoordinateExtentRange } from "@vue-flow/core";

export type NodeType = 'application' | 'database' | 'fileLocation' | 'server' | 'table';

export interface CanvasNode {
  id: string;

  type: string;
  
  data: {
    label: string;
    // type: NodeType | 'unknown'; //Change to 'type' when rendering each type seperately
    resourceId: string;
    parentPosition?: {
      x: number,
      y: number
    }
  }

  parentNode?: string;
  extent?: 'parent' | CoordinateExtent | CoordinateExtentRange;

  position: {
    x: number;
    y: number;
  };
  style?: any;
  class?: string;
}