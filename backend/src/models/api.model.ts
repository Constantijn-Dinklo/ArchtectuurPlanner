import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IApi extends Document {
    url: string
    applicationId: Types.ObjectId | null;
}

const ApiSchema = new Schema<IApi>({
    url: {
        type: Schema.Types.String,
        required: true,
    },
    applicationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Application'
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

            return ret
        },
    }
});

const Api: Model<IApi> = mongoose.model<IApi>('Api', ApiSchema);

export default Api;