// One place something is connected to: a resource (a table is a resource as well), or a component inside a resource,
// like a file in a file location. A connection to a database or file location has one end per known table or file,
// and only an end of the database or file location itself while none is known
export interface ConnectionEndTarget {
    resourceId: string;
    componentId: string | null;
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
