import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IResourceField, ResourceFieldSchema } from '../information/resourceField.model';
import { IResourceObject, ResourceObjectSchema } from '../information/resourceObject.model';

export const APPLICATION_HOSTINGS = ['unknown', 'saas', 'onPremise'] as const;
export type ApplicationHosting = typeof APPLICATION_HOSTINGS[number];

export interface IApplication extends Document {
    organisationId: Types.ObjectId;
    name: string;
    version: string;
    // The organisation that develops the application
    developer: string;
    // Whether the application is used as a service (SaaS) or runs on our own servers (on-premise)
    hosting: ApplicationHosting;
    // For a SaaS application: where it can be found
    websiteUrl: string;
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
    developer: {
        type: Schema.Types.String,
        default: ''
    },
    hosting: {
        type: Schema.Types.String,
        enum: APPLICATION_HOSTINGS,
        default: 'unknown'
    },
    websiteUrl: {
        type: Schema.Types.String,
        default: ''
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