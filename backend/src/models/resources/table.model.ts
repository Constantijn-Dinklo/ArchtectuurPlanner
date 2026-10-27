import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IResourceField, ResourceFieldSchema } from '../information/resourceField.model';


export interface ITable extends Document {
    environmentId: Types.ObjectId;
    databaseId: Types.ObjectId;
    name: string;
    columns: IResourceField[];
}

const TableSchema = new Schema<ITable>({
    environmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true
    },
    databaseId: {
        type: Schema.Types.ObjectId,
        ref: 'Database',
        required: true,
        index: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    columns: {
        type: [ResourceFieldSchema],
        required: true,
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

            delete ret.environmentId
            delete ret.createdAt
            delete ret.updatedAt

            return ret
        },
    }
});

const Table: Model<ITable> = mongoose.model<ITable>('Table', TableSchema);

export default Table;