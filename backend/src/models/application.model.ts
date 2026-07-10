import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IApplication extends Document {
    organisationId: Types.ObjectId;
    name: string;
}

const ApplicationSchema = new Schema<IApplication>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true
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

            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Application: Model<IApplication> = mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;