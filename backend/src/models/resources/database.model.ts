import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDatabase extends Document {
    organisationId: Types.ObjectId;
    name: string;
    engine: string;
}

const DatabaseSchema = new Schema<IDatabase>({
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
    engine: {
        type: Schema.Types.String,
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

            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Database: Model<IDatabase> = mongoose.model<IDatabase>('Database', DatabaseSchema);

export default Database;