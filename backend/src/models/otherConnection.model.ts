import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// How the information gets from the source to the target, as far as it is known
export const OTHER_CONNECTION_METHODS = ['human', 'feature', 'file', 'email', 'unknown'] as const;
export type OtherConnectionMethod = typeof OTHER_CONNECTION_METHODS[number];

// A connection between any two resources that is not an api, database connection or script.
// For example a person entering information by hand, a 'send' button in an application of which we do not know
// how it works, a file or an e-mail. It is also the fallback when it is unclear how information is transferred.
export interface IOtherConnection extends Document {
    organisationId: Types.ObjectId;
    sourceId: Types.ObjectId | null;
    targetId: Types.ObjectId | null;
    method: OtherConnectionMethod;
    description: string;

    // The information of the source that is carried over to the target
    informationFieldIds: Types.ObjectId[];
    informationObjectIds: Types.ObjectId[];
}

const OtherConnectionSchema = new Schema<IOtherConnection>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    method: {
        type: Schema.Types.String,
        enum: OTHER_CONNECTION_METHODS,
        default: 'unknown'
    },
    description: {
        type: Schema.Types.String,
        default: ''
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

const OtherConnection: Model<IOtherConnection> = mongoose.model<IOtherConnection>('OtherConnection', OtherConnectionSchema);

export default OtherConnection;
