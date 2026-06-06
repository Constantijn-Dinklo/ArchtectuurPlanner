import mongoose, { Document, Schema, Model } from 'mongoose';


export interface IOrganisation extends Document {
    name: string;
}

const OrganisationSchema: Schema<IOrganisation> = new Schema<IOrganisation>({
    name: {
        type: String,
        required: true,
        unique: true
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

            return ret
        },
    }
});

const Organisation: Model<IOrganisation> = mongoose.model<IOrganisation>('Organisation', OrganisationSchema);

export default Organisation;