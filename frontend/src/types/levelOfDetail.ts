import type { ResourceType } from "./resource.type"

export type LevelOfDetail = 'strategy' | 'governance' | 'information' | 'application' | 'database' | 'technology'

type ResourceRenderRule = {
    visible: boolean
    expandable: boolean
    expanded: boolean
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
            visible: true,
            expandable: true,
            expanded: true,
        },
        table: {
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
        }
    },
    'technology': {}
}

export function getVisibleResourceTypes(level: LevelOfDetail): ResourceType[] {
  return Object.entries(LevelOfDetailConfig[level])
    .filter(([, rule]) => rule.visible)
    .map(([resourceType]) => resourceType as ResourceType)
}