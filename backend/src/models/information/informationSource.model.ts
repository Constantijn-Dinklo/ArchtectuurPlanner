import { Schema, Types } from 'mongoose';

export const SOURCE_RESOURCE_TYPES = ['application', 'database', 'table', 'fileLocation', 'server', 'external'] as const;
export type SourceResourceType = typeof SOURCE_RESOURCE_TYPES[number];

// The resource an InformationField or InformationObject originates from. Every piece of information has at
// most one source, and it is never set automatically: the user decides where the information comes from.
// Information without a source is allowed, but is shown with a warning.
export interface IInformationSource {
    resourceId: Types.ObjectId;
    resourceType: SourceResourceType;
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
        }
    },
    {
        _id: false,
        id: false
    }
);
