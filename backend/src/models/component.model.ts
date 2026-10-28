import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Levels of the architecture: a host (server) holds resources, a resource holds components.
// A component is a part of a resource: a script that runs in an application or file location,
// or a file in a file location. Components never contain other components.
export const COMPONENT_KINDS = ['script', 'file'] as const;
export type ComponentKind = typeof COMPONENT_KINDS[number];

export const FILE_TYPES = ['excel', 'csv', 'word', 'pdf', 'other'] as const;

// Where information sits in a component: a script takes it in (input) and produces it (output), a file contains it
export const INFORMATION_SLOTS = ['input', 'output', 'contains'] as const;
export type InformationSlot = typeof INFORMATION_SLOTS[number];
export type FileType = typeof FILE_TYPES[number];

// One side of what a script reads from or writes to: a resource (a table is a resource as well),
// or a component inside a resource, like a file in a file location
export interface IComponentEnd {
    resourceId: Types.ObjectId;
    componentId: Types.ObjectId | null;
}

const ComponentEndSchema = new Schema<IComponentEnd>(
    {
        resourceId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        componentId: {
            type: Schema.Types.ObjectId,
            default: null
        }
    },
    { _id: false }
);

export interface IComponent extends Document {
    environmentId: Types.ObjectId;
    kind: ComponentKind;
    name: string;
    description: string;

    // The resource the component is part of: the host of a script, the file location of a file
    resourceId: Types.ObjectId;
    resourceType: 'application' | 'fileLocation';

    // Script: what it reads from and writes to
    inputs: IComponentEnd[];
    outputs: IComponentEnd[];

    // Script: the information it takes in from what it reads, and the information it produces for what it writes.
    // What it produces is what it carries to the resources it writes to
    inputInformationFieldIds: Types.ObjectId[];
    inputInformationObjectIds: Types.ObjectId[];
    outputInformationFieldIds: Types.ObjectId[];
    outputInformationObjectIds: Types.ObjectId[];

    // File: the information the file contains
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
        enum: ['application', 'fileLocation'],
        required: true
    },
    inputs: {
        type: [ComponentEndSchema],
        default: []
    },
    outputs: {
        type: [ComponentEndSchema],
        default: []
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
