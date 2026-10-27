import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IView extends Document {
    environmentId: Types.ObjectId;
    name: string;
}

const ViewSchema = new Schema<IView>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true,
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

const View: Model<IView> = mongoose.model<IView>('View', ViewSchema);

export default View;