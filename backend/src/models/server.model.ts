import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IServer extends Document {
    organisationId: Types.ObjectId;
    name: string;
    IP: string;
    entityIds: Types.ObjectId[];
}

const ServerSchema = new Schema<IServer>({
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
    IP: {
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

            delete ret.organisationId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
})

const Server: Model<IServer> = mongoose.model<IServer>('Server', ServerSchema);

export default Server;