import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { CONNECTION_KINDS, ConnectionKind, PART_TYPES, PartType } from '../types/connection.type';

// One collection for every connection, with a schema per kind for the fields only that kind has (discriminators).
// Only the connection service uses these models: the rest of the backend works with the types in connection.type.ts

export interface IPartRef {
    id: Types.ObjectId;
    type: PartType;
}

const PartRefSchema = new Schema<IPartRef>(
    {
        id: {
            type: Schema.Types.ObjectId,
            required: true
        },
        type: {
            type: Schema.Types.String,
            enum: PART_TYPES,
            required: true
        }
    },
    { _id: false }
);

export interface IConnection extends Document {
    environmentId: Types.ObjectId;
    kind: ConnectionKind;
    source: IPartRef;
    target: IPartRef;
    description: string;
}

export interface IApiConnection extends IConnection {
    kind: 'api';
    apiId: Types.ObjectId;
}

const ConnectionSchema = new Schema<IConnection>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    source: {
        type: PartRefSchema,
        required: true
    },
    target: {
        type: PartRefSchema,
        required: true
    },
    description: {
        type: Schema.Types.String,
        default: ''
    }
},
{
    discriminatorKey: 'kind',
    timestamps: true,
    toJSON: {
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

// The connections of a part, in either direction
ConnectionSchema.index({ environmentId: 1, 'source.id': 1 });
ConnectionSchema.index({ environmentId: 1, 'target.id': 1 });

const Connection: Model<IConnection> = mongoose.model<IConnection>('Connection', ConnectionSchema);

// A model per kind; every kind is registered, so the kind is always checked
const KIND_SCHEMAS: Record<ConnectionKind, Schema> = {
    api: new Schema<IApiConnection>({
        apiId: {
            type: Schema.Types.ObjectId,
            ref: 'Api',
            required: true
        }
    }),
    database: new Schema({}),
    file: new Schema({}),
    manual: new Schema({}),
    email: new Schema({}),
    feature: new Schema({}),
    unknown: new Schema({}),
    undecided: new Schema({})
};

export const CONNECTION_MODELS = Object.fromEntries(
    CONNECTION_KINDS.map((kind) => [kind, Connection.discriminator(`Connection_${kind}`, KIND_SCHEMAS[kind], kind)])
) as unknown as Record<ConnectionKind, Model<IConnection>>;

export default Connection;
