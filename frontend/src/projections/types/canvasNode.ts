import type { CoordinateExtent, CoordinateExtentRange } from "@vue-flow/core";

export type NodeType = 'application' | 'database' | 'fileLocation' | 'server' | 'table';

export interface CanvasNode {
  id: string;
  
  data: {
    label: string;
    type: NodeType | 'unknown'; //Change to 'type' when rendering each type seperately
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