import mongoose, { Document, Model, Schema, Types } from 'mongoose';

const RESOURCE_TYPES = ['application', 'database', 'fileLocation'] as const;

export type ResourceType = typeof RESOURCE_TYPES[number];

export interface IResource extends Document {
    organisationId: Types.ObjectId;
    name: string;
    type: ResourceType;
}

const ResourceSchema = new Schema<IResource>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    type: {
        type: Schema.Types.String,
        required: true,
        enum: RESOURCE_TYPES
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

            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Resource: Model<IResource> = mongoose.model<IResource>('Resource', ResourceSchema);

export default Resource;