import{ Schema, Types } from 'mongoose';

export interface IResourceObject {
    informationObjectId: Types.ObjectId;
    position: number;
}

export const ResourceObjectSchema = new Schema<IResourceObject>(
    {
        informationObjectId: {
            type: Schema.Types.ObjectId,
            ref: 'InformationObject',
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

export interface IResourceObjectExpanded {
    informationObjectId: {
        _id: string,
        objectName: string,
        informationFieldIds: string[]
    },
    position: number;
}

//TODO: resolve the informationfields
export function resolveResourceObject(object: IResourceObjectExpanded) {
    return {
        id: object.informationObjectId._id,
        objectName: object.informationObjectId.objectName,
        informationFields: object.informationObjectId.informationFieldIds,
        position: object.position
    };
}