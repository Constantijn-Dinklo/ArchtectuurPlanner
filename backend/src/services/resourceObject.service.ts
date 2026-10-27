import { UserJwtPayload } from "../middelware";
import InformationObject from "../models/information/informationObject.models";
import InformationField from "../models/information/informationField.model";
import { ResourceType } from "../types/resource.type";
import { createInformationField } from "./resourceField.service";

export type resourceObjectInformation =
    | {
          objectName: string;
      }
    | {
          informationObjectId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
          // The connection the information comes through, when the user picked one
          viaConnectionType?: 'api' | 'script' | 'database' | 'other' | 'component' | null;
          viaConnectionId?: string | null;
      };

export async function createInformationObject(user: UserJwtPayload, objectName: string) {
    //Create new information field since
    const newInformationObject = await new InformationObject({
        environmentId: user.environmentId,
        objectName: objectName
    });
    newInformationObject.save();
    return newInformationObject;
}

export type ObjectFieldInformation =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
      };

export async function addInformationFieldToInformationObject(user: UserJwtPayload, informationObjectId: string, objectFieldInformation: ObjectFieldInformation) {
    let informationField = undefined;
    if("fieldName" in objectFieldInformation){
        informationField = await createInformationField(user, objectFieldInformation.fieldName);
    }
    else {
        informationField = await InformationField.findOne({
            _id: objectFieldInformation.informationFieldId,
            environmentId: user.environmentId
        });
    }
    if(!informationField) {
        throw new Error("InformationField not found");
    }

    const informationObject = await InformationObject.findOneAndUpdate(
        {
            _id: informationObjectId,
            environmentId: user.environmentId,
        },
        {
            $addToSet: {
                informationFieldIds: informationField._id
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!informationObject) {
        throw new Error("InformationObject not found");
    }

    return {
        informationObject,
        informationFields: [informationField]
    };
}

export async function deleteInformationFieldFromInformationObject(user: UserJwtPayload, informationObjectId: string, informationFieldId: string) {
    const informationObject = await InformationObject.findOneAndUpdate(
        {
            _id: informationObjectId,
            environmentId: user.environmentId,
        },
        {
            $pull: {
                informationFieldIds: informationFieldId
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!informationObject) {
        throw new Error("InformationObject not found");
    }

    return { informationObject };
}