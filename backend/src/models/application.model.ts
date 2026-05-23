import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IApplication extends Document {
    name: string;
}

const ApplictionSchema = new Schema<IApplication>({
    name: {
        type: Schema.Types.String,
        required: true
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

const Application: Model<IApplication> = mongoose.model<IApplication>('Application', ApplictionSchema);

export default Application;