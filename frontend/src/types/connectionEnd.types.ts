// One place something is connected to: a resource (a table is a resource as well), a component inside a resource,
// like a file in a file location, or an api of an application or external element. A connection to a database or file
// location has one end per known table or file, and only an end of the resource itself while none is known.
// The same goes for reading from an application or external element, per api
export interface ConnectionEndTarget {
    resourceId: string;
    componentId: string | null;
    apiId?: string | null;
}

// The information is what is read from this end or written to it
export interface ConnectionEnd extends ConnectionEndTarget {
    informationFieldIds: string[];
    informationObjectIds: string[];
}

// Information that can be picked in an InformationEditor
export interface InformationOption {
    id: string;
    label: string;
}

// Information to add: an existing field or object, or a new one with this name
export type InformationFieldToAdd = { fieldName: string } | { informationFieldId: string };
export type InformationObjectToAdd = { objectName: string } | { informationObjectId: string };
