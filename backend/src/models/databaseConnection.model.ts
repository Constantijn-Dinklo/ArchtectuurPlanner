import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IDatabaseConnection extends Document {
    environmentId: Types.ObjectId;
    databaseId: Types.ObjectId;
    entityId: Types.ObjectId;
    operation: string[];
}

const DatabaseConnectionSchema = new Schema<IDatabaseConnection>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    databaseId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    operation: {
        type: [Schema.Types.String],
        enum: ['read', 'write'],
        required: true,
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

            delete ret.environmentId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const DatabaseConnection: Model<IDatabaseConnection> = mongoose.model<IDatabaseConnection>('DatabaseConnection', DatabaseConnectionSchema);

export default DatabaseConnection;