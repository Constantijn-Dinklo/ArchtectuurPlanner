import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IInformationField extends Document {
    environmentId: Types.ObjectId;
    fieldName: string;
}

const InformationFieldSchema = new Schema<IInformationField>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    fieldName: {
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

            delete ret.environmentId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const InformationField: Model<IInformationField> = mongoose.model<IInformationField>('InformationField', InformationFieldSchema);

export default InformationField;