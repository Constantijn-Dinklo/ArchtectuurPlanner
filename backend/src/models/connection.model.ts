import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IConnection extends Document {
    sourceId: Types.ObjectId | null;
    targetId: Types.ObjectId | null;
}

const ConnectionSchema = new Schema<IConnection>({
    sourceId: {
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

            return ret
        },
    }
});

const Connection: Model<IConnection> = mongoose.model<IConnection>('Connection', ConnectionSchema);

export default Connection;