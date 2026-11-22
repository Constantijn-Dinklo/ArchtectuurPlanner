import mongoose, { Model, Schema, Types } from 'mongoose';


export interface IResourceObjectRelation {
    environmentId: Types.ObjectId;
    informationObjectId: Types.ObjectId;
    sourceResourceId: Types.ObjectId;
    sourceResourceType: string;
    targetResourceId: Types.ObjectId;
    targetResourceType: string;

    // The connection the information travels through from the source to the target.
    // Only a relation inside one resource (from its input to its output) has none
    connectionId: Types.ObjectId | null;
}

export const ResourceObjectRelationSchema = new Schema<IResourceObjectRelation>(
    {
        environmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Environment',
            required: true,
            index: true
        },
        informationObjectId: {
            type: Schema.Types.ObjectId,
            ref: 'InformationObject',
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

const ResourceObjectRelation: Model<IResourceObjectRelation> = mongoose.model<IResourceObjectRelation>('ResourceObjectRelation', ResourceObjectRelationSchema);

export default ResourceObjectRelation;
