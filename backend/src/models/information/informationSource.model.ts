import { Schema, Types } from 'mongoose';

// Only what information lives in can be a source: fileLocation stands for a file in it, see componentId
export const SOURCE_RESOURCE_TYPES = ['application', 'table', 'fileLocation', 'external'] as const;
export type SourceResourceType = typeof SOURCE_RESOURCE_TYPES[number];

// How a piece of information comes into being at its source
export const SOURCE_METHODS = ['input', 'computed', 'imported', 'generated', 'other'] as const;
export type SourceMethod = typeof SOURCE_METHODS[number];

// The resource an InformationField or InformationObject originates from. Every piece of information has at
// most one source, and it is never set automatically: the user decides where the information comes from.
// Information without a source is allowed, but is shown with a warning.
// A file is not a resource: as in the ends of a script, it is its file location plus the file as componentId.
export interface IInformationSource {
    resourceId: Types.ObjectId;
    resourceType: SourceResourceType;
    componentId: Types.ObjectId | null;
}

export const InformationSourceSchema = new Schema<IInformationSource>(
    {
        resourceId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        resourceType: {
            type: Schema.Types.String,
            enum: SOURCE_RESOURCE_TYPES,
            required: true
        },
        componentId: {
            type: Schema.Types.ObjectId,
            default: null
        }
    },
    {
        _id: false,
        id: false
    }
);
