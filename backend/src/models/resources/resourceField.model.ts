import{ Schema, Types } from 'mongoose';

export interface IResourceField {
    informationFieldId: Types.ObjectId;
    position: number;
}

export const ResourceFieldSchema = new Schema<IResourceField>(
    {
        informationFieldId: {
            type: Schema.Types.ObjectId,
            ref: 'InformationField',
            required: true
        },
        position: {
            type: Schema.Types.Number,
            required: true
        }
    },
    {
        _id: false,
    }
);

export interface IResourceFieldExpanded {
    informationFieldId: {
        _id: string,
        fieldName: string
    },
    position: number;
}

export function resolveResourceField(field: IResourceFieldExpanded) {
    return {
        id: field.informationFieldId._id,
        fieldName: field.informationFieldId.fieldName,
        position: field.position
    };
}