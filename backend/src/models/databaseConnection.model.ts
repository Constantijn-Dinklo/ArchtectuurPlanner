import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IDatabaseConnection extends Document {
    organisationId: Types.ObjectId;
    databaseId: Types.ObjectId;
    entityId: Types.ObjectId;
    operation: string[];
}

const DatabaseConnectionSchema = new Schema<IDatabaseConnection>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
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

            delete ret.organisationId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const DatabaseConnection: Model<IDatabaseConnection> = mongoose.model<IDatabaseConnection>('DatabaseConnection', DatabaseConnectionSchema);

export default DatabaseConnection;