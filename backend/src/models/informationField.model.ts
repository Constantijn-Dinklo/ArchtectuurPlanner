import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IInformationField extends Document {
    organisationId: Types.ObjectId;
    fieldName: string;
}

const InformationFieldSchema = new Schema<IInformationField>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
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

            delete ret.organisationId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const InformationField: Model<IInformationField> = mongoose.model<IInformationField>('InformationField', InformationFieldSchema);

export default InformationField;