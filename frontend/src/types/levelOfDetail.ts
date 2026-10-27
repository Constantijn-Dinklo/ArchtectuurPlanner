import type { ResourceType } from "./resource.type"

// 'detail' is the most zoomed in level: it also shows what is inside a resource, like the endpoints of an application
export type LevelOfDetail = 'strategy' | 'governance' | 'information' | 'application' | 'database' | 'detail' | 'technology'

type ResourceRenderRule = {
    visible: boolean
    expandable: boolean
    expanded: boolean
    // Whether the endpoints (dashboards, maps, ...) of the resource are shown in its node
    showEndpoints?: boolean
}

// What can be a node on the canvas: a resource, or a component inside a resource (a script, a file)
export type CanvasEntityType = ResourceType | 'component'

type LevelOfDetailConfig = Partial<Record<CanvasEntityType, ResourceRenderRule>>

export const LevelOfDetailConfig: Record<LevelOfDetail, LevelOfDetailConfig> = {
    'strategy': {},
    'governance': {},
    'information': {},
    'application': {
        application: {
            visible: true,
            expandable: true,
            expanded: false,
        },
        database: {
            visible: true,
            expandable: true,
            expanded: false,
        },
        fileLocation: {
            visible: true,
            expandable: false,
            expanded: false,
        },
        server: {
            visible: true,
            expandable: true,
            expanded: true,
        },
        table: {
            visible: false,
            expandable: false,
            expanded: false
        },
        external: {
            visible: true,
            expandable: true,
            expanded: false
        },
        component: {
            visible: false,
            expandable: false,
            expanded: false
        }
    },
    'database': {
        application: {
            visible: true,
            expandable: true,
            expanded: true,
        },
        database: {
            visible: true,
            expandable: true,
            expanded: false,
        },
        fileLocation: {
            visible: true,
            expandable: false,
            expanded: false,
        },
        server: {
            visible: false,
            expandable: true,
            expanded: true,
        },
        table: {
            visible: true,
            expandable: false,
            expanded: false
        },
        external: {
            visible: true,
            expandable: true,
            expanded: true
        },
        component: {
            visible: true,
            expandable: false,
            expanded: false
        }
    },
    'detail': {
        application: {
            visible: true,
            expandable: true,
            expanded: true,
            showEndpoints: true
        },
        database: {
            visible: true,
            expandable: true,
            expanded: false,
        },
        fileLocation: {
            visible: true,
            expandable: false,
            expanded: false,
        },
        server: {
            visible: false,
            expandable: true,
            expanded: true,
        },
        table: {
            visible: true,
            expandable: false,
            expanded: false
        },
        external: {
            visible: true,
            expandable: true,
            expanded: true
        },
        component: {
            visible: true,
            expandable: false,
            expanded: false
        }
    },
    'technology': {}
}

export function getVisibleResourceTypes(level: LevelOfDetail): CanvasEntityType[] {
  return Object.entries(LevelOfDetailConfig[level])
    .filter(([, rule]) => rule.visible)
    .map(([resourceType]) => resourceType as CanvasEntityType)
}

export function isResourceTypeVisible(
  level: LevelOfDetail,
  resourceType: CanvasEntityType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.visible ?? false
}

export function isResourceTypeExpanded(
  level: LevelOfDetail,
  resourceType: CanvasEntityType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.expanded ?? false
}
export function isResourceEndpointsVisible(
  level: LevelOfDetail,
  resourceType: CanvasEntityType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.showEndpoints ?? false
}
