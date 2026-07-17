import mongoose, { Document, Model, Schema, Types } from 'mongoose';

const VIEW_NODE_TYPES = ['application', 'database', 'fileLocation', 'server', 'table'] as const;

export type ViewNodeType = typeof VIEW_NODE_TYPES[number];

export interface IViewNode extends Document {
    organisationId: Types.ObjectId;
    viewId: Types.ObjectId;
    entityId: Types.ObjectId;
    entityType: ViewNodeType,
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
    entityId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    entityType: {
        type: Schema.Types.String,
        required: true,
        enum: VIEW_NODE_TYPES
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