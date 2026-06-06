import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  organisationId: Types.ObjectId;
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