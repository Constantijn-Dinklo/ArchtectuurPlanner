import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IApiConnection extends Document {
    environmentId: Types.ObjectId;
    sourceId: Types.ObjectId | null;
    sourceUrlId: Types.ObjectId | null;
    targetId: Types.ObjectId | null;
}

const ApiConnectionSchema = new Schema<IApiConnection>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    sourceUrlId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
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

const ApiConnection: Model<IApiConnection> = mongoose.model<IApiConnection>('ApiConnection', ApiConnectionSchema);

export default ApiConnection;