import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// One architecture: all its resources, information, connections and views belong to it.
// An environment is owned by one organisation. Every user of that organisation has access to it,
// other users (for example consultants of another organisation) get access as a member.
export interface IEnvironment extends Document {
    organisationId: Types.ObjectId;
    name: string;
    // The user that made the environment, its first admin
    createdBy: Types.ObjectId | null;
}

const EnvironmentSchema = new Schema<IEnvironment>({
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
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
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

            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Environment: Model<IEnvironment> = mongoose.model<IEnvironment>('Environment', EnvironmentSchema);

export default Environment;
