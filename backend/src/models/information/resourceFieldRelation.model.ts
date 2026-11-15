import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IResourceFieldRelation {
    environmentId: Types.ObjectId;
    informationFieldId: Types.ObjectId;
    sourceResourceId: Types.ObjectId;
    sourceResourceType: string;
    targetResourceId: Types.ObjectId;
    targetResourceType: string;

    // The connection the information travels through from the source to the target.
    // Only a relation inside one resource (from its input to its output) has none
    connectionId: Types.ObjectId | null;
    // Until scripts are connection ends themselves: the script the information goes through instead of a connection
    scriptId: Types.ObjectId | null;
}

export const ResourceFieldRelationSchema = new Schema<IResourceFieldRelation>(
    {
        environmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Environment',
            required: true,
            index: true
        },
        informationFieldId: {
            type: Schema.Types.ObjectId,
            ref: 'InformationField',
            required: true
        },
        sourceResourceId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        sourceResourceType: {
            type: Schema.Types.String,
            required: true
        },
        targetResourceId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        targetResourceType: {
            type: Schema.Types.String,
            required: true
        },
        connectionId: {
            type: Schema.Types.ObjectId,
            ref: 'Connection',
            default: null,
            index: true
        },
        scriptId: {
            type: Schema.Types.ObjectId,
            ref: 'Component',
            default: null
        },
    },
    {
        timestamps: true,
        toJSON:  {
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
    }
);

const ResourceFieldRelation: Model<IResourceFieldRelation> = mongoose.model<IResourceFieldRelation>('ResourceFieldRelation', ResourceFieldRelationSchema);

export default ResourceFieldRelation;