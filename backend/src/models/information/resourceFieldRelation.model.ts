import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IResourceFieldRelation {
    organisationId: Types.ObjectId;
    informationFieldId: Types.ObjectId;
    sourceResourceId: Types.ObjectId;
    sourceResourceType: string;
    targetResourceId: Types.ObjectId;
    targetResourceType: string;

    // The connection the information travels through from the source to the target, chosen by the user
    // when there is more than one (api connection, script, database connection or other connection)
    viaConnectionType: 'api' | 'script' | 'database' | 'other' | null;
    viaConnectionId: Types.ObjectId | null;
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
        viaConnectionType: {
            type: Schema.Types.String,
            enum: ['api', 'script', 'database', 'other', null],
            default: null
        },
        viaConnectionId: {
            type: Schema.Types.ObjectId,
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