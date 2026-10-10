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

type LevelOfDetailConfig = Partial<Record<ResourceType, ResourceRenderRule>>

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
        }
    },
    'technology': {}
}

export function getVisibleResourceTypes(level: LevelOfDetail): ResourceType[] {
  return Object.entries(LevelOfDetailConfig[level])
    .filter(([, rule]) => rule.visible)
    .map(([resourceType]) => resourceType as ResourceType)
}

export function isResourceTypeVisible(
  level: LevelOfDetail,
  resourceType: ResourceType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.visible ?? false
}

export function isResourceTypeExpanded(
  level: LevelOfDetail,
  resourceType: ResourceType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.expanded ?? false
}
export function isResourceEndpointsVisible(
  level: LevelOfDetail,
  resourceType: ResourceType
): boolean {
  return LevelOfDetailConfig[level][resourceType]?.showEndpoints ?? false
}
