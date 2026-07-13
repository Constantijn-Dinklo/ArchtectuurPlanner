import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IApi extends Document {
    organisationId: Types.ObjectId;
    applicationId: Types.ObjectId | null;
    
    url: string;
    hasAuthentication: boolean;
}

const ApiSchema = new Schema<IApi>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    applicationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Resource'
    },
    url: {
        type: Schema.Types.String,
        required: true,
    },
    hasAuthentication: {
        type: Schema.Types.Boolean,
        default: false
    }
},
{
    timestamps: true,
    toJSON:  {
        virtuals: true,

        transform(_, ret: any) {
            ret.id = ret._id.toString()

            delete ret._id
            delete ret.__v

            delete ret.organisationId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Api: Model<IApi> = mongoose.model<IApi>('Api', ApiSchema);

export default Api;