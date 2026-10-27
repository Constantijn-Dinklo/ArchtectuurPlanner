import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IServer extends Document {
    // resourceId: Types.ObjectId;
    environmentId: Types.ObjectId;
    name: string;
    ip: string;
    entityIds: Types.ObjectId[];
}

const ServerSchema = new Schema<IServer>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    ip: {
        type: Schema.Types.String,
    },
    entityIds: [{
        type: Schema.Types.ObjectId,
    }]
},
{
    timestamps: true,
    toJSON:  {
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
})

const Server: Model<IServer> = mongoose.model<IServer>('Server', ServerSchema);

export default Server;