import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IResourceField, ResourceFieldSchema } from '../information/resourceField.model';
import { IResourceObject, ResourceObjectSchema } from '../information/resourceObject.model';

export const EXTERNAL_KINDS = ['unknown', 'system', 'database', 'file', 'organisation'] as const;
export type ExternalKind = typeof EXTERNAL_KINDS[number];

// An element outside the domain (company). It is a black box: we only know which information we send to it
// (received) and which information we read from it (provided), not what happens inside.
export interface IExternal extends Document {
    organisationId: Types.ObjectId;
    name: string;
    // The organisation the external element belongs to, e.g. "Belastingdienst", and who owns it there
    externalOrganisation: string;
    owner: string;
    // A hint of what the external element is, when known
    kind: ExternalKind;
    description: string;

    providedInformationFields: IResourceField[];
    providedInformationObjects: IResourceObject[];
    receivedInformationFields: IResourceField[];
    receivedInformationObjects: IResourceObject[];
}

const ExternalSchema = new Schema<IExternal>({
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
    externalOrganisation: {
        type: Schema.Types.String,
        default: ''
    },
    owner: {
        type: Schema.Types.String,
        default: ''
    },
    kind: {
        type: Schema.Types.String,
        enum: EXTERNAL_KINDS,
        default: 'unknown'
    },
    description: {
        type: Schema.Types.String,
        default: ''
    },
    providedInformationFields: {
        type: [ResourceFieldSchema],
        default: []
    },
    providedInformationObjects: {
        type: [ResourceObjectSchema],
        default: []
    },
    receivedInformationFields: {
        type: [ResourceFieldSchema],
        default: []
    },
    receivedInformationObjects: {
        type: [ResourceObjectSchema],
        default: []
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

const External: Model<IExternal> = mongoose.model<IExternal>('External', ExternalSchema);

export default External;
