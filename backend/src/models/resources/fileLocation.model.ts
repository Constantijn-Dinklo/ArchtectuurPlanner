import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IFileLocation extends Document {
    organisationId: Types.ObjectId;
    name: string;
}

const FileLocationSchema = new Schema<IFileLocation>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
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

            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const FileLocation: Model<IFileLocation> = mongoose.model<IFileLocation>('FileLocation', FileLocationSchema);

export default FileLocation;