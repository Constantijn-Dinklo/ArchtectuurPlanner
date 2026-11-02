import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// What a user may do in its organisation: an admin manages the users and environments of the organisation,
// and is admin in every environment of it. A member only has the roles of its environments
export const ORGANISATION_ROLES = ['admin', 'member'] as const;
export type OrganisationRole = typeof ORGANISATION_ROLES[number];

export interface IUser extends Document {
  email: string;
  password: string;
  organisationId: Types.ObjectId;
  organisationRole: OrganisationRole;
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