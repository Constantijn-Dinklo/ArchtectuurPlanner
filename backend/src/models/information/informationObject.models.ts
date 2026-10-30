import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IInformationSource, InformationSourceSchema } from './informationSource.model';

export interface IInformationObject extends Document {
    environmentId: Types.ObjectId;
    objectName: string;
    informationFieldIds: Types.ObjectId[];
    source: IInformationSource | null;
}

const InformationObjectSchema = new Schema<IInformationObject>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
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
    },
    source: {
        type: InformationSourceSchema,
        default: null
    }
},
{
    timestamps: true,
    toJSON:  {
        virtuals: true,

        transform(_, ret: any) {
            ret.id = ret._id.toString()
            // Information created before sources existed has no source yet
            ret.source = ret.source ?? null

            delete ret._id
            delete ret.__v

            delete ret.environmentId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const InformationObject: Model<IInformationObject> = mongoose.model<IInformationObject>('InformationObject', InformationObjectSchema);

export default InformationObject;