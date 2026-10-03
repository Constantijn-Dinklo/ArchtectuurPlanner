import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IInformationObject extends Document {
    organisationId: Types.ObjectId;
    objectName: string;
    informationFieldIds: Types.ObjectId[];
}

const InformationObjectSchema = new Schema<IInformationObject>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    objectName: {
        type: Schema.Types.String,
        required: true,
    },
    informationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
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

            delete ret.organisationId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const InformationObject: Model<IInformationObject> = mongoose.model<IInformationObject>('InformationObject', InformationObjectSchema);

export default InformationObject;