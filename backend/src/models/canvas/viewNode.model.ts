import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface IViewNode extends Document {
    organisationId: Types.ObjectId;
    viewId: Types.ObjectId;
    resourceId: Types.ObjectId;
    position: {
        x: number;
        y: number;   
    };
}

const ViewNodeSchema = new Schema<IViewNode>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    viewId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'View'
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    position:{
        x: {
            type: Schema.Types.Number,
            required: true,
        },
        y: {
            type: Schema.Types.Number,
            required: true,
        }
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

const ViewNode: Model<IViewNode> = mongoose.model<IViewNode>('ViewNode', ViewNodeSchema);

export default ViewNode;