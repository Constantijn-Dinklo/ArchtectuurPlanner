import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IInformationSource, InformationSourceSchema, SOURCE_METHODS, SourceMethod } from './informationSource.model';

export interface IInformationField extends Document {
    environmentId: Types.ObjectId;
    fieldName: string;
    source: IInformationSource | null;
    sourceMethod: SourceMethod | null;
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
    },
    source: {
        type: InformationSourceSchema,
        default: null
    },
    sourceMethod: {
        type: Schema.Types.String,
        enum: SOURCE_METHODS,
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
            ret.sourceMethod = ret.sourceMethod ?? null

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