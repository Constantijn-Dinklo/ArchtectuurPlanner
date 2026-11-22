import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Levels of the architecture: a host (server) holds resources, a resource holds components.
// A component is a part of a resource: a script that runs in an application or file location,
// a file in a file location, or a table in a database. Components never contain other components.
export const COMPONENT_KINDS = ['script', 'file', 'table'] as const;
export type ComponentKind = typeof COMPONENT_KINDS[number];

export const FILE_TYPES = ['excel', 'csv', 'word', 'pdf', 'other'] as const;

// Where information sits in a component: a script takes it in (input) and produces it (output), a file or table
// contains it (a table only fields: its columns)
export const INFORMATION_SLOTS = ['input', 'output', 'contains'] as const;
export type InformationSlot = typeof INFORMATION_SLOTS[number];
export type FileType = typeof FILE_TYPES[number];

// What a component can be part of
export const COMPONENT_RESOURCE_TYPES = ['application', 'fileLocation', 'database'] as const;
export type ComponentResourceType = typeof COMPONENT_RESOURCE_TYPES[number];

export interface IComponent extends Document {
    environmentId: Types.ObjectId;
    kind: ComponentKind;
    name: string;
    description: string;

    // The resource the component is part of: the host of a script, the file location of a file, the database of a table
    resourceId: Types.ObjectId;
    resourceType: ComponentResourceType;

    // Script: the information it takes in and produces, like the inputs and outputs of an application. What it reads
    // from and writes to are connections, and the information that goes over them relations, as for an application
    inputInformationFieldIds: Types.ObjectId[];
    inputInformationObjectIds: Types.ObjectId[];
    outputInformationFieldIds: Types.ObjectId[];
    outputInformationObjectIds: Types.ObjectId[];

    // File: the information the file contains. Table: its columns, only fields
    informationFieldIds: Types.ObjectId[];
    informationObjectIds: Types.ObjectId[];

    // File: what kind of file it is
    fileType: FileType;
}

const ComponentSchema = new Schema<IComponent>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    kind: {
        type: Schema.Types.String,
        enum: COMPONENT_KINDS,
        required: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    description: {
        type: Schema.Types.String,
        default: ''
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    resourceType: {
        type: Schema.Types.String,
        enum: COMPONENT_RESOURCE_TYPES,
        required: true
    },
    inputInformationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
        default: []
    },
    inputInformationObjectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationObject',
        default: []
    },
    outputInformationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
        default: []
    },
    outputInformationObjectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationObject',
        default: []
    },
    informationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
        default: []
    },
    informationObjectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationObject',
        default: []
    },
    fileType: {
        type: Schema.Types.String,
        enum: FILE_TYPES,
        default: 'other'
    }
},
{
    timestamps: true,
    toJSON: {
        virtuals: true,

        transform(_, ret: any) {
            ret.id = ret._id.toString()

            delete ret._id
            delete ret.__v

            delete ret.environmentId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Component: Model<IComponent> = mongoose.model<IComponent>('Component', ComponentSchema);

export default Component;
