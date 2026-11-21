import { UserJwtPayload } from "../middelware";
import InformationField from "../models/information/informationField.model";
import { ResourceType } from "../types/resource.type";


export type ResourceFieldInformation =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
          // The connection the information comes through; none inside one resource
          connectionId?: string | null;
      };

export async function createInformationField(user: UserJwtPayload, fieldName: string) {
    //Create new information field since
    const newInformationField = await new InformationField({
        environmentId: user.environmentId,
        fieldName: fieldName
    });
    newInformationField.save();
    return newInformationField;
}