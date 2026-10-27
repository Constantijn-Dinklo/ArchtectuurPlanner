import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IScript extends Document {
    environmentId: Types.ObjectId;
    name: string;
    inputIds: Types.ObjectId[];
    outputIds: Types.ObjectId[];
}

const ScriptSchema = new Schema<IScript>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    inputIds: [{
        type: Schema.Types.ObjectId,
    }],
    outputIds: [{
        type: Schema.Types.ObjectId
    }]
},
{
    timestamps: true,
    toJSON:  {
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
})

const Script: Model<IScript> = mongoose.model<IScript>('Script', ScriptSchema);

export default Script;