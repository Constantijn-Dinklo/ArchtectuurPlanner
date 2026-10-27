import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// What a member may do in the environment. Stored already, but not enforced yet: for now every member can edit
export const ENVIRONMENT_ROLES = ['admin', 'editor', 'viewer'] as const;
export type EnvironmentRole = typeof ENVIRONMENT_ROLES[number];

// Gives a user access to an environment. Users of the organisation that owns the environment always have access;
// this is how the creator becomes admin and how users of other organisations (consultants) are added.
export interface IEnvironmentMember extends Document {
    environmentId: Types.ObjectId;
    userId: Types.ObjectId;
    role: EnvironmentRole;
    addedBy: Types.ObjectId | null;
}

const EnvironmentMemberSchema = new Schema<IEnvironmentMember>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: Schema.Types.String,
        enum: ENVIRONMENT_ROLES,
        default: 'editor'
    },
    addedBy: {
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

// A user is a member of an environment at most once
EnvironmentMemberSchema.index({ environmentId: 1, userId: 1 }, { unique: true });

const EnvironmentMember: Model<IEnvironmentMember> = mongoose.model<IEnvironmentMember>('EnvironmentMember', EnvironmentMemberSchema);

export default EnvironmentMember;
