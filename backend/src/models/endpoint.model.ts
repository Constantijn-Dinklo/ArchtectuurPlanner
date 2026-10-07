import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const ENDPOINT_TYPES = ['dashboard', 'map', 'download', 'report', 'screen', 'other'] as const;
export type EndpointType = typeof ENDPOINT_TYPES[number];

// A place inside a resource where information is used by people, for example a dashboard, a map or a download.
// Information that reaches an endpoint has a purpose there, so it does not count as an unused dead end.
export interface IEndpoint extends Document {
    organisationId: Types.ObjectId;
    resourceId: Types.ObjectId;
    resourceType: string;

    name: string;
    type: EndpointType;

    // The information of the resource that is shown or used in the endpoint
    informationFieldIds: Types.ObjectId[];
    informationObjectIds: Types.ObjectId[];
}

const EndpointSchema = new Schema<IEndpoint>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    resourceType: {
        type: Schema.Types.String,
        required: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    type: {
        type: Schema.Types.String,
        enum: ENDPOINT_TYPES,
        default: 'other'
    },
    informationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
        default: []
    },
    informationObjectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationObject',
        default: []
    }
},
{
    timestamps: true,
    toJSON: {
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

const Endpoint: Model<IEndpoint> = mongoose.model<IEndpoint>('Endpoint', EndpointSchema);

export default Endpoint;
