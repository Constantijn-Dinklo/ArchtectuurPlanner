import type { CoordinateExtent, CoordinateExtentRange } from "@vue-flow/core";

export type NodeType = 'application' | 'database' | 'fileLocation' | 'server' | 'table';

export interface CanvasNode {
  id: string;

  type: string;
  
  data: {
    label: string;
    // type: NodeType | 'unknown'; //Change to 'type' when rendering each type seperately
    resourceId: string;
  }

  parentNode?: string;
  parentPosition?: {
    x: number,
    y: number
  }
  extent?: 'parent' | CoordinateExtent | CoordinateExtentRange;

  position: {
    x: number;
    y: number;
  };
  style?: any;
  draggable?: boolean;
  class?: string;
}