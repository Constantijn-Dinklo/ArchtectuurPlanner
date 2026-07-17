import mongoose, { Document, Model, Schema, Types } from 'mongoose';


export interface ITable extends Document {
    organisationId: Types.ObjectId;
    databaseId: Types.ObjectId;
    name: string;
    columns: [string];
}

const TableSchema = new Schema<ITable>({
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
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
    columns: [{
        type: Schema.Types.String,
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
});

const Table: Model<ITable> = mongoose.model<ITable>('Table', TableSchema);

export default Table;