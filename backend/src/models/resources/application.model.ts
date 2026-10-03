import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IResourceField, ResourceFieldSchema } from '../information/resourceField.model';
import { IResourceObject, ResourceObjectSchema } from '../information/resourceObject.model';

export interface IApplication extends Document {
    organisationId: Types.ObjectId;
    name: string;
    version: string;
    inputInformationObjects: IResourceObject[];
    outputInformationObjects: IResourceObject[];
    inputInformationFields: IResourceField[];
    outputInformationFields: IResourceField[];
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
    },
    version: {
        type: Schema.Types.String
    },
    inputInformationObjects: {
        type: [ResourceObjectSchema],
        required: true
    },
    outputInformationObjects: {
        type: [ResourceObjectSchema],
        required: true
    },
    inputInformationFields: {
        type: [ResourceFieldSchema],
        required: true,
    },
    outputInformationFields: {
        type: [ResourceFieldSchema],
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

const Application: Model<IApplication> = mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;