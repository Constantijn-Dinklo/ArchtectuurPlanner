import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// What a user may do in its organisation: an admin manages the users and environments of the organisation,
// and is admin in every environment of it. A member only has the roles of its environments
export const ORGANISATION_ROLES = ['admin', 'member'] as const;
export type OrganisationRole = typeof ORGANISATION_ROLES[number];

// Removing a user makes it inactive: it cannot log in, but an admin can bring it back. Deleting an inactive user
// marks it deleted: it is then invisible for everyone, until it is removed from the database for good
export const USER_STATUSES = ['active', 'inactive', 'deleted'] as const;
export type UserStatus = typeof USER_STATUSES[number];

// Query filters. Users from before the status existed have none, so they count as active
export const ACTIVE_USER = { status: { $nin: ['inactive', 'deleted'] as UserStatus[] } };
export const VISIBLE_USER = { status: { $ne: 'deleted' as UserStatus } };

export interface IUser extends Document {
  email: string;
  password: string;
  organisationId: Types.ObjectId;
  organisationRole: OrganisationRole;
  status: UserStatus;
}

const UserSchema: Schema<IUser> = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  organisationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organistation',
    required: true
  },
  organisationRole: {
    type: String,
    enum: ORGANISATION_ROLES,
    default: 'member'
  },
  status: {
    type: String,
    enum: USER_STATUSES,
    default: 'active'
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

            return ret
        },
    }
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;