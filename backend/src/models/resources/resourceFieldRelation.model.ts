import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IResourceFieldRelation {
    organisationId: Types.ObjectId;
    informationFieldId: Types.ObjectId;
    sourceResourceId: Types.ObjectId;
    sourceResourceType: string;
    targetResourceId: Types.ObjectId;
    targetResourceType: string;
}

export const ResourceFieldRelationSchema = new Schema<IResourceFieldRelation>(
    {
        organisationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organisation',
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