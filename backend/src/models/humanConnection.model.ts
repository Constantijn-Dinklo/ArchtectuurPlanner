import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Information flows from the source to the target because a person manually enters it into the target
export interface IHumanConnection extends Document {
    organisationId: Types.ObjectId;
    sourceId: Types.ObjectId | null;
    targetId: Types.ObjectId | null;
    description: string;

    // The information of the source that is carried over to the target
    informationFieldIds: Types.ObjectId[];
    informationObjectIds: Types.ObjectId[];
}

const HumanConnectionSchema = new Schema<IHumanConnection>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null
    },
    description: {
        type: Schema.Types.String,
        default: ''
    },
    informationFieldIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationField',
        default: []
    },
    informationObjectIds: {
        type: [Schema.Types.ObjectId],
        ref: 'InformationObject',
        default: []
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

const HumanConnection: Model<IHumanConnection> = mongoose.model<IHumanConnection>('HumanConnection', HumanConnectionSchema);

export default HumanConnection;
